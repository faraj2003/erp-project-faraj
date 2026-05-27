// __tests__/orders.test.js
// TRD §6: Focus on the Complete Order transaction logic.
// Tests that intentionally trigger insufficient stock errors to verify
// the transaction successfully rolls back and does NOT write to the
// Transaction Audit Log.

const request = require("supertest");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance"); // FIX: import StockBalance
const {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  getApp,
  generateToken,
  authHeader,
  createUser,
  createItem,
  createOrder,
  TEST_COMPANY_ID, // FIX: import so we can scope StockBalance queries
} = require("./helpers/setup");

let app;

beforeAll(async () => {
  await connectTestDB();
  app = getApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearCollections();
});

// FIX: Helper — sum all StockBalance quantities for a given item.
// The Item model has no currentStock field; stock lives in StockBalance docs.
const getStockTotal = async (itemId) => {
  const balances = await StockBalance.find({
    itemId,
    companyId: TEST_COMPANY_ID,
  });
  return balances.reduce((sum, b) => sum + b.quantity, 0);
};

// ── GET /api/orders ───────────────────────────────────────────────

describe("GET /api/orders", () => {
  it("returns 401 if unauthenticated", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns paginated orders with pagination metadata", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const rawMat = await createItem({
      sku: "RM-001",
      type: "raw_material",
      currentStock: 500,
    });
    const finGood = await createItem({
      sku: "FG-001",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    // Create 3 orders
    await Promise.all([
      createOrder(manager._id, rawMat._id, finGood._id, {
        orderNumber: "PO-001",
      }),
      createOrder(manager._id, rawMat._id, finGood._id, {
        orderNumber: "PO-002",
      }),
      createOrder(manager._id, rawMat._id, finGood._id, {
        orderNumber: "PO-003",
      }),
    ]);

    const res = await request(app)
      .get("/api/orders?page=1&limit=2")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.hasNextPage).toBe(true);
  });

  it("filters by status", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const rawMat = await createItem({
      sku: "RM-002",
      type: "raw_material",
      currentStock: 500,
    });
    const finGood = await createItem({
      sku: "FG-002",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    await createOrder(manager._id, rawMat._id, finGood._id, {
      orderNumber: "PO-PEND",
      status: "Pending",
    });
    await createOrder(manager._id, rawMat._id, finGood._id, {
      orderNumber: "PO-CANC",
      status: "Cancelled",
    });

    const res = await request(app)
      .get("/api/orders?status=Pending")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe("Pending");
  });
});

// ── POST /api/orders ──────────────────────────────────────────────

describe("POST /api/orders", () => {
  it("allows staff to successfully create a new order", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    // Create required inventory items for the order
    const inputItem = await createItem({ type: "raw_material" });
    const outputItem = await createItem({ type: "finished_good" });

    const orderPayload = {
      orderNumber: "PO-STAFF-001",
      inputs: [{ itemId: inputItem._id, quantityRequired: 10 }],
      outputs: [{ itemId: outputItem._id, quantityProduced: 5 }],
      notes: "Started by night shift staff",
    };

    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send(orderPayload);

    // Should be 201 now because of updated RBAC!
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Pending");
  });

  it("creates an order successfully for manager", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const rawMat = await createItem({
      sku: "RM-004",
      type: "raw_material",
      currentStock: 100,
    });
    const finGood = await createItem({
      sku: "FG-004",
      type: "finished_good",
      minStockLevel: 0,
    });

    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send({
        orderNumber: "PO-MGR-001",
        inputs: [{ itemId: rawMat._id, quantityRequired: 20 }],
        outputs: [{ itemId: finGood._id, quantityProduced: 5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNumber).toBe("PO-MGR-001");
    expect(res.body.data.status).toBe("Pending");
    expect(res.body.data.managerId.toString()).toBe(manager._id.toString());
  });

  it("returns 400 on Zod validation failure (missing inputs)", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const finGood = await createItem({
      sku: "FG-005",
      type: "finished_good",
      minStockLevel: 0,
    });

    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send({
        orderNumber: "PO-NOINPUT",
        inputs: [], // Empty — Zod should reject
        outputs: [{ itemId: finGood._id, quantityProduced: 5 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });
});

// ── PATCH /api/orders/:id/status — ACID Transaction Tests ─────────

describe("PATCH /api/orders/:id/status — ACID Transaction", () => {
  it("✅ SUCCESS: deducts inputs, adds outputs, writes audit log, marks Completed", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const rawMat = await createItem({
      sku: "RM-TX-001",
      type: "raw_material",
      currentStock: 100, // stored as StockBalance
      minStockLevel: 5,
    });
    const finGood = await createItem({
      sku: "FG-TX-001",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    const order = await createOrder(manager._id, rawMat._id, finGood._id, {
      orderNumber: "PO-TX-001",
      inputs: [{ itemId: rawMat._id, quantityRequired: 30 }],
      outputs: [{ itemId: finGood._id, quantityProduced: 10 }],
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Completed");

    // FIX: Verify stock via StockBalance, not Item.currentStock (which doesn't exist on the model)
    expect(await getStockTotal(rawMat._id)).toBe(70); // 100 - 30
    expect(await getStockTotal(finGood._id)).toBe(10); // 0 + 10

    // Verify audit log was written — 1 deduction + 1 addition
    const transactions = await Transaction.find({ orderId: order._id });
    expect(transactions.length).toBe(2);
    const deduction = transactions.find((t) => t.type === "deduction");
    const addition = transactions.find((t) => t.type === "addition");
    expect(deduction.quantityChanged).toBe(30);
    expect(addition.quantityChanged).toBe(10);
  });

  it("🔴 ROLLBACK: insufficient stock → stock unchanged, NO audit log written", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    // Only 20 in stock but order needs 50
    const rawMat = await createItem({
      sku: "RM-LOW-001",
      type: "raw_material",
      currentStock: 20, // stored as StockBalance
      minStockLevel: 5,
    });
    const finGood = await createItem({
      sku: "FG-LOW-001",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    const order = await createOrder(manager._id, rawMat._id, finGood._id, {
      orderNumber: "PO-LOW-001",
      inputs: [{ itemId: rawMat._id, quantityRequired: 50 }], // EXCEEDS STOCK
      outputs: [{ itemId: finGood._id, quantityProduced: 10 }],
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    // Should reject with 400
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient stock/i);

    // ── THE CRITICAL ROLLBACK ASSERTIONS ──

    // FIX: Read stock from StockBalance, not Item.currentStock
    expect(await getStockTotal(rawMat._id)).toBe(20); // unchanged
    expect(await getStockTotal(finGood._id)).toBe(0); // unchanged — outputs were NOT applied

    // NO audit log records should exist — transaction was fully rolled back
    const transactions = await Transaction.find({ orderId: order._id });
    expect(transactions.length).toBe(0);
  });

  it("🔴 ROLLBACK: multi-item order — if second input fails, first is also rolled back", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const rawMat1 = await createItem({
      sku: "RM-M1",
      type: "raw_material",
      currentStock: 100,
    });
    const rawMat2 = await createItem({
      sku: "RM-M2",
      type: "raw_material",
      currentStock: 5,
    }); // too low
    const finGood = await createItem({
      sku: "FG-M1",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    const order = await createOrder(manager._id, rawMat1._id, finGood._id, {
      orderNumber: "PO-MULTI-001",
      inputs: [
        { itemId: rawMat1._id, quantityRequired: 10 }, // would succeed
        { itemId: rawMat2._id, quantityRequired: 50 }, // will fail
      ],
      outputs: [{ itemId: finGood._id, quantityProduced: 5 }],
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    expect(res.status).toBe(400);

    // FIX: Read stock from StockBalance, not Item.currentStock
    // Both raw material stocks must be unchanged (first deduction also rolled back)
    expect(await getStockTotal(rawMat1._id)).toBe(100); // rolled back
    expect(await getStockTotal(rawMat2._id)).toBe(5); // unchanged

    // Zero audit logs
    const transactions = await Transaction.find({ orderId: order._id });
    expect(transactions.length).toBe(0);
  });

  it("returns 400 if order is already Completed", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const rawMat = await createItem({
      sku: "RM-DONE",
      type: "raw_material",
      currentStock: 100,
    });
    const finGood = await createItem({
      sku: "FG-DONE",
      type: "finished_good",
      currentStock: 0,
      minStockLevel: 0,
    });

    const order = await createOrder(manager._id, rawMat._id, finGood._id, {
      orderNumber: "PO-DONE",
      status: "Completed",
    });

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });

  it("returns 404 if order does not exist", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .patch(`/api/orders/${fakeId}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    expect(res.status).toBe(404);
  });

  // ── NEW: Staff cannot update order status ──
  it("returns 403 if staff tries to update an order status", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    const order = await createOrder(
      staff._id,
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    );

    const res = await request(app)
      .patch(`/api/orders/${order._id}/status`)
      .set(authHeader(token))
      .send({ status: "Completed" });

    expect(res.status).toBe(403);
  });
});

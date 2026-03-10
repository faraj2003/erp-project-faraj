// __tests__/inventory.test.js
const request = require("supertest");
const {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  getApp,
  generateToken,
  authHeader,
  createUser,
  createItem,
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

// ── GET /api/inventory ────────────────────────────────────────────

describe("GET /api/inventory", () => {
  it("returns 401 if unauthenticated", async () => {
    const res = await request(app).get("/api/inventory");
    expect(res.status).toBe(401);
  });

  it("returns all items for any authenticated user", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    await createItem({ name: "Steel Rods", type: "raw_material" });
    await createItem({ name: "Bolts", type: "raw_material" });

    const res = await request(app).get("/api/inventory").set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
  });

  it("filters by type=raw_material", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    await createItem({ name: "Steel", type: "raw_material", sku: "RAW-001" });
    await createItem({ name: "Gear", type: "finished_good", sku: "FIN-001" });

    const res = await request(app)
      .get("/api/inventory?type=raw_material")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].type).toBe("raw_material");
  });

  it("filters by search query (case-insensitive)", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    await createItem({ name: "Aluminum Sheet", sku: "ALU-001" });
    await createItem({ name: "Copper Wire", sku: "COP-001" });

    const res = await request(app)
      .get("/api/inventory?search=aluminum")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toBe("Aluminum Sheet");
  });

  it("returns 400 on invalid type filter", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    const res = await request(app)
      .get("/api/inventory?type=invalid_type")
      .set(authHeader(token));

    expect(res.status).toBe(400);
  });
});

// ── POST /api/inventory ───────────────────────────────────────────

describe("POST /api/inventory", () => {
  it("returns 403 if staff tries to create item", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    const res = await request(app)
      .post("/api/inventory")
      .set(authHeader(token))
      .send({
        sku: "SKU-001",
        name: "Item",
        type: "raw_material",
        minStockLevel: 10,
        unit: "kg",
      });

    expect(res.status).toBe(403);
  });

  it("allows manager to create item", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");

    const res = await request(app)
      .post("/api/inventory")
      .set(authHeader(token))
      .send({
        sku: "RAW-STL-01",
        name: "Steel Rods",
        type: "raw_material",
        minStockLevel: 50,
        unit: "kg",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe("RAW-STL-01");
    expect(res.body.data.name).toBe("Steel Rods");
  });

  it("returns 400 on missing required fields (Zod)", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const res = await request(app)
      .post("/api/inventory")
      .set(authHeader(token))
      .send({ type: "raw_material" });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("returns 400 on duplicate SKU", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");

    const payload = {
      sku: "DUP-001",
      name: "Item",
      type: "raw_material",
      minStockLevel: 10,
      unit: "kg",
    };
    await request(app)
      .post("/api/inventory")
      .set(authHeader(token))
      .send(payload);
    const res = await request(app)
      .post("/api/inventory")
      .set(authHeader(token))
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/duplicate/i);
  });
});

// ── GET /api/inventory/low-stock ─────────────────────────────────

describe("GET /api/inventory/low-stock", () => {
  it("returns only items where currentStock < minStockLevel", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    await createItem({ sku: "LOW-001", currentStock: 5, minStockLevel: 50 }); // low
    await createItem({ sku: "LOW-002", currentStock: 5, minStockLevel: 3 }); // ok
    await createItem({ sku: "LOW-003", currentStock: 0, minStockLevel: 10 }); // low

    const res = await request(app)
      .get("/api/inventory/low-stock")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data[0].currentStock).toBe(0);
  });

  it("returns empty array when all items are adequately stocked", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");

    await createItem({ sku: "OK-001", currentStock: 100, minStockLevel: 10 });
    await createItem({ sku: "OK-002", currentStock: 50, minStockLevel: 50 });

    const res = await request(app)
      .get("/api/inventory/low-stock")
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

// ── PUT & DELETE /api/inventory/:id (Manager/Admin Only) ──────────

describe("RBAC: Inventory Modifications", () => {
  it("allows manager to update an item", async () => {
    const manager = await createUser({ role: "manager" });
    const token = generateToken(manager._id, "manager");
    const item = await createItem({ name: "Old Name", currentStock: 10 });

    const res = await request(app)
      .put(`/api/inventory/${item._id}`)
      .set(authHeader(token))
      .send({ name: "Updated Name", currentStock: 50 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.currentStock).toBe(50);
  });

  it("returns 403 if staff tries to delete an item", async () => {
    const staff = await createUser({ role: "staff" });
    const token = generateToken(staff._id, "staff");
    const item = await createItem({ name: "Do Not Delete" });

    const res = await request(app)
      .delete(`/api/inventory/${item._id}`)
      .set(authHeader(token));

    expect(res.status).toBe(403);
  });

  it("allows admin to delete an item", async () => {
    const admin = await createUser({ role: "admin" });
    const token = generateToken(admin._id, "admin");
    const item = await createItem({ name: "Delete Me" });

    const res = await request(app)
      .delete(`/api/inventory/${item._id}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
  });
});

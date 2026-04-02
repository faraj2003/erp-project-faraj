// __tests__/helpers/setup.js
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const createApp = require("../../app");

let mongod;

// ── DB lifecycle ──────────────────────────────────────────────────

const connectTestDB = async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

// ── App ───────────────────────────────────────────────────────────

const getApp = () => {
  process.env.JWT_SECRET = "test_jwt_secret_for_testing_only";
  process.env.JWT_EXPIRES_IN = "1d";
  process.env.NODE_ENV = "test";
  return createApp();
};

// ── Token helpers ─────────────────────────────────────────────────

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || "test_jwt_secret_for_testing_only",
    { expiresIn: "1d" },
  );
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ── Seed factories ────────────────────────────────────────────────

const User = require("../../models/User");
const Item = require("../../models/Item");
const Order = require("../../models/Order");
const Location = require("../../models/Location");
const StockBalance = require("../../models/StockBalance");

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: `test_${Date.now()}@example.com`,
    password: "password123",
    role: "staff",
    ...overrides,
  });
};

// Fix: currentStock is not a field on the Item schema — stock lives in StockBalance.
// If currentStock is passed, we create a default Location and StockBalance record
// so that controllers computing totalStock from balances behave correctly in tests.
const createItem = async (overrides = {}) => {
  const { currentStock, ...itemOverrides } = overrides;

  const item = await Item.create({
    sku: `SKU-${Date.now()}`,
    name: "Test Item",
    type: "raw_material",
    minStockLevel: 10,
    unit: "kg",
    ...itemOverrides,
  });

  // If a currentStock value was provided, seed a StockBalance for it
  if (currentStock !== undefined) {
    // Find or create a reusable default test location
    let location = await Location.findOne({ name: "__test_default__" });
    if (!location) {
      location = await Location.create({
        name: "__test_default__",
        type: "Warehouse",
      });
    }

    await StockBalance.create({
      itemId: item._id,
      locationId: location._id,
      quantity: currentStock,
    });
  }

  return item;
};

const createOrder = async (
  managerId,
  inputItemId,
  outputItemId,
  overrides = {},
) => {
  return Order.create({
    orderNumber: `PO-TEST-${Date.now()}`,
    managerId,
    status: "Pending",
    inputs: [{ itemId: inputItemId, quantityRequired: 10 }],
    outputs: [{ itemId: outputItemId, quantityProduced: 5 }],
    ...overrides,
  });
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  getApp,
  generateToken,
  authHeader,
  createUser,
  createItem,
  createOrder,
};

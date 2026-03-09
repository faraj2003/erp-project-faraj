// __tests__/helpers/setup.js
// Shared utilities used across all test suites:
//   - In-memory MongoDB via mongodb-memory-server (no real DB needed)
//   - createApp() — the Express app without socket.io or server.listen
//   - Token generators for each role
//   - Factory functions to seed Users, Items, Orders

// FIX: Import MongoMemoryReplSet instead of MongoMemoryServer
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const createApp = require("../../app");

let mongod;

// ── DB lifecycle ──────────────────────────────────────────────────

const connectTestDB = async () => {
  // FIX: Use MongoMemoryReplSet to enable ACID transactions
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

const createUser = async (overrides = {}) => {
  return User.create({
    name: "Test User",
    email: `test_${Date.now()}@example.com`,
    password: "password123",
    role: "staff",
    ...overrides,
  });
};

const createItem = async (overrides = {}) => {
  return Item.create({
    sku: `SKU-${Date.now()}`,
    name: "Test Item",
    type: "raw_material",
    currentStock: 100,
    minStockLevel: 10,
    unit: "kg",
    ...overrides,
  });
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

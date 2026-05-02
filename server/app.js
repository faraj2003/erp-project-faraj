// server/app.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

// Import Route Files
const procurementRoutes = require("./routes/procurementRoutes");

const createApp = () => {
  const app = express();

  // --- Middleware ---
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
  app.use(express.json());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  // Apply general limiter to all API routes
  app.use("/api/", apiLimiter);

  // Static files for item images
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // Health Check
  app.get("/health", (req, res) =>
    res
      .status(200)
      .json({ success: true, message: "FactoryFlow API is running." }),
  );

  // --- Unified API v1 Routes ---
  // All routes now follow the /api/v1/ prefix to prevent 404 mismatches

  // Authentication & Users
  app.use("/api/v1/auth", require("./routes/authRoutes")(loginLimiter));
  app.use("/api/v1/users", require("./routes/userRoutes"));

  // Core Inventory & Warehouse
  app.use("/api/v1/inventory", require("./routes/inventoryRoutes"));
  app.use("/api/v1/locations", require("./routes/locationRoutes"));
  app.use("/api/v1/units", require("./routes/unitRoutes"));
  app.use("/api/v1/system", require("./routes/systemRoutes"));

  // Orders & Manufacturing
  app.use("/api/v1/orders", require("./routes/orderRoutes"));
  app.use("/api/v1/boms", require("./routes/bomRoutes"));

  // Procurement & Suppliers
  app.use("/api/v1/procurement", procurementRoutes);
  app.use("/api/v1/suppliers", require("./routes/supplierRoutes"));

  // Analytics
  app.use("/api/v1/analytics", require("./routes/analyticsRoutes"));

  // --- Error Handling ---
  app.use(errorHandler);

  return app;
};

module.exports = createApp;

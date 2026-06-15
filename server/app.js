// server/app.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const xss = require("xss"); // Using base xss package for Express v5 compatibility
const errorHandler = require("./middleware/errorHandler");
const procurementRoutes = require("./routes/procurementRoutes");

const createApp = () => {
  const app = express();

  // Security Headers
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));

  // Body Parser
  app.use(express.json());

  // Express v5 Compatible XSS Sanitization Middleware
  // Safely mutates object properties in-place to avoid triggering the read-only getter crash
  const sanitizeData = (data) => {
    if (typeof data === "string") return xss(data);
    if (typeof data === "object" && data !== null) {
      Object.keys(data).forEach((key) => {
        data[key] = sanitizeData(data[key]);
      });
    }
    return data;
  };

  app.use((req, res, next) => {
    if (req.body) sanitizeData(req.body);
    if (req.query) sanitizeData(req.query);
    if (req.params) sanitizeData(req.params);
    next();
  });

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Global API Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 1000 : 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  // Login-Specific Limiter (Brute Force Protection)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    // Allow 100 attempts during automated testing, but keep the strict 5 limit for production/dev
    max: process.env.NODE_ENV === "test" ? 100 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many login attempts. Please try again after 15 minutes.",
    },
  });

  app.use("/api/", apiLimiter);

  // Serve uploaded item images as static files
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/health", (req, res) =>
    res
      .status(200)
      .json({ success: true, message: "FactoryFlow API is running." }),
  );

  app.use("/api/auth", require("./routes/authRoutes")(loginLimiter));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/inventory", require("./routes/inventoryRoutes"));
  app.use("/api/orders", require("./routes/orderRoutes"));
  app.use("/api/analytics", require("./routes/analyticsRoutes"));
  app.use("/api/locations", require("./routes/locationRoutes"));
  app.use("/api/procurement", procurementRoutes);

  // Newly added system routes for Categories and Units
  app.use("/api/system", require("./routes/systemRoutes"));

  app.use(errorHandler);

  return app;
};

module.exports = createApp;

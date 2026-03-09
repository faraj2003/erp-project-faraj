// app.js
// Exports a configured Express app WITHOUT connecting to DB or starting a server.
// This lets Supertest spin up the app in memory during tests without side effects.

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
  app.use(express.json());

  // Disable morgan in test env to keep output clean
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit in tests
    standardHeaders: false,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);

  app.get("/health", (req, res) =>
    res.status(200).json({ success: true, message: "FactoryFlow API is running." })
  );

  app.use("/api/auth", require("./routes/authRoutes")(loginLimiter));
  app.use("/api/users", require("./routes/userRoutes"));
  app.use("/api/inventory", require("./routes/inventoryRoutes"));
  app.use("/api/orders", require("./routes/orderRoutes"));
  app.use("/api/analytics", require("./routes/analyticsRoutes"));

  app.use(errorHandler);

  return app;
};

module.exports = createApp;

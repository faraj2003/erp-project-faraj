// server/app.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");
const procurementRoutes = require("./routes/procurementRoutes");

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
  app.use(express.json());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Too many login attempts. Please try again after 15 minutes.",
    },
  });

  app.use("/api/", apiLimiter);

  // PRD-INV-005/006: Serve uploaded item images as static files.
  // In production, replace this with a CDN or cloud storage URL in the controller.
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

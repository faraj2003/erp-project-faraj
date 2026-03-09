// routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getProductionMetrics,
  getMonthlyTrends,
  getStockMovement,
} = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All analytics routes are Admin only
router.use(protect, authorize("admin"));

// GET /api/analytics/production — Total units produced per item (bar chart)
router.get("/production", getProductionMetrics);

// GET /api/analytics/trends — Monthly production volume (line chart)
router.get("/trends", getMonthlyTrends);

// GET /api/analytics/stock-movement — Additions vs deductions per item
router.get("/stock-movement", getStockMovement);

module.exports = router;

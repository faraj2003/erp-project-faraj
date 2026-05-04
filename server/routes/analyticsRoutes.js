// server/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getProductionMetrics,
  getStockMovementMetrics,
  getInventoryTrends,
} = require("../controllers/analyticsController");

router.use(protect);

// Dashboards and Trend Analytics
router.get("/production", authorize("admin", "manager"), getProductionMetrics);
router.get(
  "/stock-movement",
  authorize("admin", "manager"),
  getStockMovementMetrics,
);
router.get("/trends", authorize("admin", "manager"), getInventoryTrends);

module.exports = router;

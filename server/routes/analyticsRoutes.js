// server/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getProductionMetrics,
  getMonthlyTrends,
  getStockMovement,
  getDashboardMetrics, // NEW
  getStockLedger, // NEW
  exportStockLedgerCSV, // NEW
} = require("../controllers/analyticsController");

router.use(protect);
// Admin/Manager level access for all analytical and audit data
router.use(authorize("admin", "manager"));

// Existing Chart Routes
router.get("/production", getProductionMetrics);
router.get("/trends", getMonthlyTrends);
router.get("/stock-movement", getStockMovement);

// NEW: PRD Reporting & Audit Routes
router.get("/dashboard", getDashboardMetrics);
router.get("/ledger", getStockLedger);
router.get("/ledger/export", exportStockLedgerCSV);

module.exports = router;

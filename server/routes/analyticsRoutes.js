// server/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getInventoryTrends } = require("../controllers/analyticsController");

router.use(protect);

// PRD-INV-025 to 028: API endpoints for external systems and trend analysis
router.get("/trends", authorize("admin", "manager"), getInventoryTrends);

module.exports = router;

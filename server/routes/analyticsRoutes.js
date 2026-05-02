const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// Only managers and admins should see executive reports
router.get(
  "/reports",
  authorize("manager", "admin"),
  analyticsController.getInventoryReports,
);

module.exports = router;

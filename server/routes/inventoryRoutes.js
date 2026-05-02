const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// BARCODE SCANNER
router.get(
  "/scan/:sku",
  authorize("staff", "manager", "admin"),
  inventoryController.scanItem,
);

// MOVEMENTS
router.post(
  "/receive",
  authorize("staff", "manager", "admin"),
  inventoryController.receiveStock,
);
router.post(
  "/issue",
  authorize("staff", "manager", "admin"),
  inventoryController.issueStock,
);
router.post(
  "/transfer",
  authorize("staff", "manager", "admin"),
  inventoryController.transferStock,
);

// ADJUSTMENTS
router.post(
  "/adjustments",
  authorize("staff", "manager", "admin"),
  inventoryController.submitAdjustmentDraft,
);
router.patch(
  "/adjustments/:adjustmentId/approve",
  authorize("manager", "admin"),
  inventoryController.approveAdjustment,
);
router.patch(
  "/adjustments/:adjustmentId/reject",
  authorize("manager", "admin"),
  inventoryController.rejectAdjustment,
);

// AUDITS & RETURNS
router.post(
  "/returns",
  authorize("staff", "manager", "admin"),
  inventoryController.processReturn,
);
router.post(
  "/cycle-count",
  authorize("manager", "admin"),
  inventoryController.logCycleCount,
);

module.exports = router;

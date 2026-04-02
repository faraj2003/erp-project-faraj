// server/routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getItems,
  createItem,
  updateItem,
  archiveItem,
  deleteItem,
  addStock,
  issueStock,
  transferStock,
  getAdjustments, // NEW
  createAdjustment, // NEW
  reviewAdjustment, // NEW
} = require("../controllers/inventoryController");

router.use(protect);

// --- Base Routes ---
router
  .route("/")
  .get(getItems)
  .post(authorize("admin", "manager", "procurement_manager"), createItem);

// ── NEW: Adjustment Workflow Routes (MUST BE ABOVE /:id ROUTES) ──
router
  .route("/adjustments")
  .get(authorize("admin", "manager"), getAdjustments)
  .post(
    authorize("admin", "manager", "dispatch_manager", "shop_worker"),
    createAdjustment,
  );

router.patch(
  "/adjustments/:id/review",
  authorize("admin"), // Only Admin/Inventory Controller can approve
  reviewAdjustment,
);

// --- Item Management Routes ---
router
  .route("/:id")
  .put(authorize("admin", "manager"), updateItem)
  .delete(authorize("admin"), deleteItem);

router.patch("/:id/archive", authorize("admin", "manager"), archiveItem);

// --- Stock Movement Routes ---
router.post(
  "/:id/stock",
  authorize("admin", "manager", "procurement_manager"),
  addStock,
);

router.post(
  "/:id/issue",
  authorize("admin", "manager", "dispatch_manager", "shop_worker"),
  issueStock,
);

router.post(
  "/:id/transfer",
  authorize("admin", "manager", "dispatch_manager"),
  transferStock,
);

module.exports = router;

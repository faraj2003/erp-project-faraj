// server/routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  getItems,
  createItem,
  updateItem,
  archiveItem,
  deleteItem,
  addStock,
  issueStock,
  transferStock,
  getLowStockItems,
  getAdjustments,
  createAdjustment,
  reviewAdjustment,
  uploadItemImage,
} = require("../controllers/inventoryController");

router.use(protect);

// --- Base Routes ---
router
  .route("/")
  .get(getItems)
  .post(authorize("admin", "manager", "procurement_manager"), createItem);

// ── IMPORTANT: All named sub-routes MUST be registered before /:id ──

// Low-stock alert route (PRD-INV-001)
router.get("/low-stock", getLowStockItems);

// Adjustment Workflow Routes (PRD-INV-020 to 024)
router
  .route("/adjustments")
  .get(authorize("admin", "manager"), getAdjustments)
  .post(
    authorize("admin", "manager", "dispatch_manager", "shop_worker"),
    createAdjustment,
  );

router.patch("/adjustments/:id/review", authorize("admin"), reviewAdjustment);

// --- Item Management Routes ---
router
  .route("/:id")
  .put(authorize("admin", "manager"), updateItem)
  .delete(authorize("admin"), deleteItem);

router.patch("/:id/archive", authorize("admin", "manager"), archiveItem);

// PRD-INV-005/006: Multimedia asset upload for an item
// upload.single("image") runs multer before the controller.
// The field name "image" must match what the frontend sends in FormData.
router.post(
  "/:id/image",
  authorize("admin", "manager"),
  upload.single("image"),
  uploadItemImage,
);

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

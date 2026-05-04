// server/routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  getDashboardMetrics,
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
  exportTransactionsCSV,
  exportItemsCSV, // <-- New
  exportAdjustmentsCSV, // <-- New
} = require("../controllers/inventoryController");

router.use(protect);

// --- Base Routes ---
router
  .route("/")
  .get(getItems)
  .post(authorize("admin", "manager", "procurement_manager"), createItem);

// ── IMPORTANT: All named sub-routes MUST be registered before /:id ──

// Dashboard Data Route (PRD-INV-001 & 002)
router.get("/dashboard", authorize("admin", "manager"), getDashboardMetrics);

// Low-stock alert route (PRD-INV-001)
router.get("/low-stock", getLowStockItems);

// Export Routes (PRD-INV-040) - Ensure complete data portability
router.get(
  "/export/transactions",
  authorize("admin", "manager"),
  exportTransactionsCSV,
);
router.get(
  "/export/items",
  authorize("admin", "manager", "procurement_manager"),
  exportItemsCSV,
);
router.get(
  "/export/adjustments",
  authorize("admin", "manager", "inventory_controller"),
  exportAdjustmentsCSV,
);

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

// server/routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// Destructure all controllers, including the new getTransactions
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
  getInventoryAlerts,
  getAdjustments,
  createAdjustment,
  reviewAdjustment,
  uploadItemImage,
  getTransactions, // <-- NEW LEDGER FUNCTION IMPORTED
  exportTransactionsCSV,
  exportItemsCSV,
  exportAdjustmentsCSV,
} = require("../controllers/inventoryController");

const {
  getCycleCounts,
  createCycleCount,
  updateCount,
  completeCycleCount,
} = require("../controllers/cycleCountController");

const {
  getBOMs,
  createBOM,
  assembleBOM,
} = require("../controllers/bomController");

// Protect ALL routes in this file
router.use(protect);

// --- Base Routes ---
router
  .route("/")
  .get(getItems)
  .post(authorize("admin", "manager", "procurement_manager"), createItem);

// ── IMPORTANT: All named sub-routes MUST be registered before /:id ──

// Dashboard Data Route
router.get("/dashboard", authorize("admin", "manager"), getDashboardMetrics);

// Alerts & Low-stock routes
router.get("/low-stock", getLowStockItems);
router.get("/alerts", getInventoryAlerts);

// --- Bill of Materials (BOM) & Kitting ---
router.get("/boms", getBOMs);
router.post("/boms", createBOM);
router.post("/boms/:id/assemble", assembleBOM);

// --- INVENTORY LEDGER ROUTE (TASK 1) ---
router.get(
  "/transactions",
  authorize("admin", "manager", "inventory_controller"),
  getTransactions,
);

// Export Routes
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

// Adjustment Workflow Routes
router
  .route("/adjustments")
  .get(authorize("admin", "manager"), getAdjustments)
  .post(
    authorize("admin", "manager", "dispatch_manager", "shop_worker"),
    createAdjustment,
  );

router.patch("/adjustments/:id/review", authorize("admin"), reviewAdjustment);

// --- Cycle Counting & Audits ---
router.get("/cycle-counts", getCycleCounts);
router.post("/cycle-counts", createCycleCount);
router.put("/cycle-counts/:id/count", updateCount);
router.post("/cycle-counts/:id/complete", completeCycleCount);

// ── EVERYTHING BELOW HERE USES /:id ──

// --- Item Management Routes ---
router
  .route("/:id")
  .put(authorize("admin", "manager"), updateItem)
  .delete(authorize("admin"), deleteItem);

router.patch("/:id/archive", authorize("admin", "manager"), archiveItem);

// Multimedia asset upload for an item
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

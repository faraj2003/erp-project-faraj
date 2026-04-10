// server/routes/procurementRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware"); // Standard ERP auth middleware
const {
  getProcurementStats,
  sendCustomAlert,
} = require("../controllers/procurementExtrasController");

// Import Controllers
const {
  createSupplier,
  getSuppliers,
} = require("../controllers/supplierController");
const {
  createPO,
  getPOs,
  approvePO,
} = require("../controllers/purchaseOrderController");
const { submitGRN } = require("../controllers/goodsReceiptController");

// All routes are protected - user must be logged in
router.use(protect);

// --- Supplier Routes ---
router.route("/suppliers").post(createSupplier).get(getSuppliers);

// --- Purchase Order Routes ---
router.route("/po").post(createPO).get(getPOs);

// The crucial Approval Route for Point 5 (Consider adding an admin/manager role check here later)
router.put("/po/:id/approve", approvePO);

// --- Goods Receipt (Truck Arrival) Routes ---
router.post("/grn", submitGRN);

router.get("/stats", getProcurementStats);

router.post("/alert", sendCustomAlert);

module.exports = router;

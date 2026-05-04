// server/routes/procurementRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// --- Imports ---
const {
  submitInvoice,
  getInvoices,
} = require("../controllers/invoiceController");
const {
  createSupplier,
  getSuppliers,
} = require("../controllers/supplierController");
const {
  createPO,
  getPOs,
  approvePO,
} = require("../controllers/purchaseOrderController");
const {
  submitGRN,
  getGRNsWithRejections,
  getAllGRNs,
} = require("../controllers/goodsReceiptController"); // FIXED: Added getAllGRNs
const {
  createReturn,
  getReturns,
} = require("../controllers/returnOrderController");
const { runSmartOrdering } = require("../controllers/automationController");
const {
  createRFQ,
  getAllRFQs,
  submitBid,
  awardBid,
} = require("../controllers/rfqController");

// FIXED: Consolidated into a single import
const {
  getProcurementStats,
  sendCustomAlert,
  getProcurementItems,
} = require("../controllers/procurementExtrasController");

// All routes are protected
router.use(protect);

// --- Supplier Routes ---
router.route("/suppliers").post(createSupplier).get(getSuppliers);

// --- Purchase Order Routes ---
router.route("/po").post(createPO).get(getPOs);
router.put("/po/:id/approve", approvePO);

// --- Goods Receipt (Truck Arrival) Routes ---
router.post("/grn", submitGRN);
router.get("/grn", getAllGRNs);
router.get("/grn/rejections", getGRNsWithRejections);

// --- Return to Vendor (RTV) Routes ---
router.post("/rtv", createReturn);
router.get("/rtv", getReturns);

// --- Advanced Stats & Alerts ---
router.get("/stats", getProcurementStats);
router.post("/alert", sendCustomAlert);
router.get("/items", getProcurementItems); // FIXED: Added missing items route for Sprint 4

// --- SPRINT 2: Automation ---
router.post("/auto-order", runSmartOrdering);

// --- SPRINT 3: Invoice & 3-Way Matching ---
router.post("/invoice", submitInvoice);
router.get("/invoice", getInvoices);

// --- SPRINT 4: RFQ & Bidding Ecosystem (FIXED: Added missing routes) ---
router.post("/rfq", createRFQ);
router.get("/rfq", getAllRFQs);
router.post("/rfq/bid", submitBid);
router.put("/rfq/award", awardBid);

module.exports = router;

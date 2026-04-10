// server/controllers/purchaseOrderController.js
const PurchaseOrder = require("../models/PurchaseOrder");

// @desc    Create a new Purchase Order (Draft or Pending)
// @route   POST /api/procurement/po
exports.createPO = async (req, res) => {
  try {
    const { supplier, items, expectedDeliveryDate, notes } = req.body;

    // Calculate total amount from items array
    const totalAmount = items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    // Generate a unique PO Number (e.g., PO-20260410-1234)
    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const po = new PurchaseOrder({
      poNumber,
      supplier,
      items,
      totalAmount,
      expectedDeliveryDate,
      notes,
      createdBy: req.user._id, // Assuming req.user is set by your authMiddleware
      status: "Pending Approval",
    });

    const savedPO = await po.save();
    res.status(201).json({ success: true, data: savedPO });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all POs (Useful for Dashboard & Manager View)
// @route   GET /api/procurement/po
exports.getPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate("supplier", "name email contactPerson")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: pos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve a Purchase Order (PROCUREMENT MANAGER ONLY)
// @route   PUT /api/procurement/po/:id/approve
exports.approvePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po)
      return res.status(404).json({ success: false, message: "PO not found" });
    if (po.status !== "Pending Approval") {
      return res
        .status(400)
        .json({ success: false, message: "Only Pending POs can be approved" });
    }

    po.status = "Approved";
    po.approvedBy = req.user._id; // The manager's ID
    po.approvedAt = Date.now();

    const updatedPO = await po.save();
    res.status(200).json({ success: true, data: updatedPO });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

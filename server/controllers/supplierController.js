// server/controllers/supplierController.js
const Supplier = require("../models/Supplier");

// @desc    Create a new supplier
// @route   POST /api/procurement/suppliers
exports.createSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    const savedSupplier = await supplier.save();
    res.status(201).json({ success: true, data: savedSupplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all active suppliers
// @route   GET /api/procurement/suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

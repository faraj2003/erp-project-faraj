// server/controllers/supplierController.js
const Supplier = require("../models/Supplier");
const Item = require("../models/Item"); // Need this to update the items

// @desc    Create a new supplier
// @route   POST /api/procurement/suppliers
exports.createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, taxId, suppliedItems } =
      req.body;

    // 1. Create and save the new vendor
    const supplier = new Supplier({
      name,
      contactPerson,
      email,
      phone,
      address,
      taxId,
    });
    const savedSupplier = await supplier.save();

    // 2. If items were selected during onboarding, link them to this vendor!
    if (suppliedItems && suppliedItems.length > 0) {
      await Item.updateMany(
        { _id: { $in: suppliedItems } },
        { $set: { supplier: savedSupplier._id } }, // Set the item's supplier field
      );
    }

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

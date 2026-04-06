// server/controllers/systemController.js
const Category = require("../models/Category");
const Unit = require("../models/Unit");

// --- CATEGORY CONTROLLERS ---
exports.getCategories = async (req, res, next) => {
  try {
    // Populate parentId to easily display the hierarchy
    const categories = await Category.find({ companyId: req.companyId })
      .populate("parentId", "name")
      .sort({ path: 1 }); // Sorting by path groups children under their parents
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({
      ...req.body,
      companyId: req.companyId,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    // Prevent deletion if it has children
    const children = await Category.countDocuments({
      parentId: req.params.id,
      companyId: req.companyId,
    });
    if (children > 0)
      return res
        .status(400)
        .json({ message: "Cannot delete a category that has sub-categories." });

    await Category.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

// --- UNIT CONTROLLERS ---
exports.getUnits = async (req, res, next) => {
  try {
    const units = await Unit.find({ companyId: req.companyId }).sort({
      isCore: -1,
      name: 1,
    });
    res.status(200).json({ success: true, data: units });
  } catch (error) {
    next(error);
  }
};

exports.createUnit = async (req, res, next) => {
  try {
    // Force user-created units to be non-core
    const unit = await Unit.create({
      ...req.body,
      companyId: req.companyId,
      isCore: false,
    });
    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

exports.deleteUnit = async (req, res, next) => {
  try {
    // The pre-delete hook in Unit.js will automatically block this if isCore is true
    await Unit.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });
    res.status(200).json({ success: true, message: "Unit deleted" });
  } catch (error) {
    next(error);
  }
};

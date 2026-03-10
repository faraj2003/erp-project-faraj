// controllers/inventoryController.js
const Item = require("../models/Item");
const AppError = require("../utils/AppError");

// @desc    Create a new inventory item
// @route   POST /api/inventory
// @access  Private (Managers & Admins only)
const createItem = async (req, res, next) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all inventory items (with search & type filters)
// @route   GET /api/inventory
// @access  Private (All authenticated users)
const getItems = async (req, res, next) => {
  try {
    let query = {};

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    if (req.query.type) {
      const validTypes = ["raw_material", "finished_good"];
      if (!validTypes.includes(req.query.type)) {
        return next(
          new AppError(
            "Invalid type filter. Use 'raw_material' or 'finished_good'",
            400,
          ),
        );
      }
      query.type = req.query.type;
    }

    const items = await Item.find(query);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items where currentStock < minStockLevel
// @route   GET /api/inventory/low-stock
// @access  Private (All authenticated users)
const getLowStockItems = async (req, res, next) => {
  try {
    const items = await Item.find({
      $expr: { $lt: ["$currentStock", "$minStockLevel"] },
    }).sort({ currentStock: 1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Update an inventory item ──
// @route   PUT /api/inventory/:id
// @access  Private (Managers & Admins only)
const updateItem = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return next(new AppError("Item not found", 404));
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Delete an inventory item ──
// @route   DELETE /api/inventory/:id
// @access  Private (Managers & Admins only)
const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return next(new AppError("Item not found", 404));
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getItems,
  getLowStockItems,
  updateItem,
  deleteItem,
};

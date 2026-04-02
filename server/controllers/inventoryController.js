// server/controllers/inventoryController.js
const path = require("path");
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const Adjustment = require("../models/Adjustment");

const VALID_TYPES = ["raw_material", "finished_good"];

// @desc    Get all items with their multi-location balances
// @route   GET /api/inventory
exports.getItems = async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const companyId = req.companyId;

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        message: `Invalid type filter. Must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    const query = { companyId, isArchived: false };
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Item.find(query).lean();
    const balances = await StockBalance.find({ companyId })
      .populate("locationId", "name type")
      .lean();

    const itemsWithBalances = items.map((item) => {
      const itemBalances = balances.filter(
        (b) => b.itemId.toString() === item._id.toString(),
      );
      const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity, 0);

      const currentSecondaryStock =
        item.conversionFactor && item.conversionFactor > 0
          ? totalStock / item.conversionFactor
          : null;

      return {
        ...item,
        currentStock: totalStock,
        currentSecondaryStock,
        balances: itemBalances,
      };
    });

    res.status(200).json({
      success: true,
      count: itemsWithBalances.length,
      data: itemsWithBalances,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new item
// @route   POST /api/inventory
exports.createItem = async (req, res, next) => {
  try {
    const item = await Item.create({ ...req.body, companyId: req.companyId });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item details
// @route   PUT /api/inventory/:id
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true, runValidators: true },
    );
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete / archive an item
// @route   PATCH /api/inventory/:id/archive
exports.archiveItem = async (req, res, next) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      { isArchived: true },
      { new: true },
    );
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json({ message: "Item archived successfully", item });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete item
// @route   DELETE /api/inventory/:id
exports.deleteItem = async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const companyId = req.companyId;

    const balances = await StockBalance.find({ itemId, companyId });
    const hasActiveStock = balances.some((b) => b.quantity > 0);
    if (hasActiveStock) {
      return res.status(400).json({
        message:
          "PRD-INV-008 Violation: Cannot delete item because active stock persists.",
      });
    }

    const history = await Transaction.findOne({ itemId, companyId });
    if (history) {
      return res.status(400).json({
        message:
          "PRD-INV-008 Violation: Cannot delete item because historical movement records exist. Please archive the item instead.",
      });
    }

    const item = await Item.findOneAndDelete({ _id: itemId, companyId });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item permanently deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Add stock to a specific location (Receipt)
// @route   POST /api/inventory/:id/stock
exports.addStock = async (req, res, next) => {
  try {
    const { locationId, quantityToAdd, unit } = req.body;
    const itemId = req.params.id;
    const companyId = req.companyId;
    const rawQty = Number(quantityToAdd);

    if (!locationId || !rawQty || rawQty <= 0) {
      return res
        .status(400)
        .json({ message: "Valid Location and positive quantity required" });
    }

    const item = await Item.findOne({ _id: itemId, companyId }).lean();
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    let baseQtyToAdd = rawQty;
    const receivingInSecondaryUnit =
      unit && item.secondaryUnit && unit === item.secondaryUnit;

    if (receivingInSecondaryUnit && item.conversionFactor > 0) {
      baseQtyToAdd = rawQty * item.conversionFactor;
    }

    let balance = await StockBalance.findOne({
      companyId,
      itemId,
      locationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (balance) {
      balance.quantity += baseQtyToAdd;
      await balance.save();
    } else {
      balance = await StockBalance.create({
        companyId,
        itemId,
        locationId,
        quantity: baseQtyToAdd,
      });
    }

    await Transaction.create({
      companyId,
      itemId,
      type: "addition",
      destinationLocationId: locationId,
      quantityChanged: baseQtyToAdd,
      newStockLevel: balance.quantity,
      performedBy: req.user._id,
    });

    res.status(200).json({
      message: "Stock added successfully",
      baseUnitsAdded: baseQtyToAdd,
      balance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Issue (deduct) stock
// @route   POST /api/inventory/:id/issue
exports.issueStock = async (req, res, next) => {
  try {
    const { locationId, quantityToIssue } = req.body;
    const itemId = req.params.id;
    const companyId = req.companyId;
    const issueQty = Number(quantityToIssue);

    if (!locationId || !issueQty || issueQty <= 0) {
      return res
        .status(400)
        .json({ message: "Valid Location and positive quantity required" });
    }

    const balance = await StockBalance.findOne({
      companyId,
      itemId,
      locationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (!balance || balance.quantity < issueQty) {
      return res.status(400).json({
        message:
          "PRD-INV-015 Violation: Cannot issue materials exceeding available local stock.",
      });
    }

    balance.quantity -= issueQty;
    await balance.save();

    await Transaction.create({
      companyId,
      itemId,
      type: "deduction",
      sourceLocationId: locationId,
      quantityChanged: issueQty,
      newStockLevel: balance.quantity,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock issued successfully", balance });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer stock between locations
// @route   POST /api/inventory/:id/transfer
exports.transferStock = async (req, res, next) => {
  try {
    const { sourceLocationId, destinationLocationId, quantity } = req.body;
    const itemId = req.params.id;
    const companyId = req.companyId;
    const transferQty = Number(quantity);

    if (!sourceLocationId || !destinationLocationId || transferQty <= 0) {
      return res.status(400).json({ message: "Invalid transfer parameters" });
    }

    if (sourceLocationId === destinationLocationId) {
      return res
        .status(400)
        .json({ message: "Source and destination cannot be the same" });
    }

    const sourceBalance = await StockBalance.findOne({
      companyId,
      itemId,
      locationId: sourceLocationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (!sourceBalance || sourceBalance.quantity < transferQty) {
      return res
        .status(400)
        .json({ message: "Insufficient stock at the source location" });
    }

    sourceBalance.quantity -= transferQty;
    await sourceBalance.save();

    let destBalance = await StockBalance.findOne({
      companyId,
      itemId,
      locationId: destinationLocationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (destBalance) {
      destBalance.quantity += transferQty;
      await destBalance.save();
    } else {
      destBalance = await StockBalance.create({
        companyId,
        itemId,
        locationId: destinationLocationId,
        quantity: transferQty,
      });
    }

    await Transaction.create({
      companyId,
      itemId,
      type: "transfer",
      sourceLocationId,
      destinationLocationId,
      quantityChanged: transferQty,
      newStockLevel: destBalance.quantity,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock transferred successfully" });
  } catch (error) {
    next(error);
  }
};

// ── ADJUSTMENT WORKFLOW (PRD-INV-020 to 024) ──

// @desc    Get all adjustments
// @route   GET /api/inventory/adjustments
exports.getAdjustments = async (req, res, next) => {
  try {
    const adjustments = await Adjustment.find({ companyId: req.companyId })
      .populate("itemId", "name sku")
      .populate("locationId", "name")
      .populate("requestedBy", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(adjustments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create an inventory adjustment (Draft or Pending)
// @route   POST /api/inventory/adjustments
exports.createAdjustment = async (req, res, next) => {
  try {
    const { itemId, locationId, quantityChange, reason, submitForReview } =
      req.body;

    if (!itemId || !locationId || quantityChange === undefined || !reason) {
      return res
        .status(400)
        .json({ message: "Missing required fields for adjustment" });
    }

    const status = submitForReview ? "pending" : "draft";

    const adjustment = await Adjustment.create({
      companyId: req.companyId,
      itemId,
      locationId,
      quantityChange,
      reason,
      status,
      requestedBy: req.user._id,
    });

    res
      .status(201)
      .json({ message: `Adjustment created as ${status}`, adjustment });
  } catch (error) {
    next(error);
  }
};

// @desc    Review (Approve/Reject) an adjustment (PRD-INV-024)
// @route   PATCH /api/inventory/adjustments/:id/review
exports.reviewAdjustment = async (req, res, next) => {
  try {
    const { action, reviewNotes } = req.body;
    const adjustmentId = req.params.id;
    const companyId = req.companyId;

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Action must be 'approve' or 'reject'" });
    }

    const adjustment = await Adjustment.findOne({
      _id: adjustmentId,
      companyId,
    });
    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment not found" });
    }

    if (adjustment.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending adjustments can be reviewed" });
    }

    adjustment.reviewedBy = req.user._id;
    adjustment.reviewNotes = reviewNotes || "";

    if (action === "reject") {
      adjustment.status = "rejected";
      await adjustment.save();
      return res
        .status(200)
        .json({ message: "Adjustment rejected", adjustment });
    }

    adjustment.status = "approved";

    let balance = await StockBalance.findOne({
      companyId,
      itemId: adjustment.itemId,
      locationId: adjustment.locationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (!balance) {
      if (adjustment.quantityChange < 0) {
        return res
          .status(400)
          .json({ message: "Cannot approve: Insufficient stock to deduct." });
      }
      balance = await StockBalance.create({
        companyId,
        itemId: adjustment.itemId,
        locationId: adjustment.locationId,
        quantity: adjustment.quantityChange,
      });
    } else {
      if (balance.quantity + adjustment.quantityChange < 0) {
        return res.status(400).json({
          message: "Cannot approve: Insufficient stock for this deduction.",
        });
      }
      balance.quantity += adjustment.quantityChange;
      await balance.save();
    }

    await adjustment.save();

    await Transaction.create({
      companyId,
      itemId: adjustment.itemId,
      type: "adjustment",
      destinationLocationId: adjustment.locationId,
      quantityChanged: adjustment.quantityChange,
      newStockLevel: balance.quantity,
      performedBy: req.user._id,
    });

    res.status(200).json({
      message: "Adjustment approved and stock updated",
      adjustment,
      balance,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items at or below minimum stock level
// @route   GET /api/inventory/low-stock
exports.getLowStockItems = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const items = await Item.find({ companyId, isArchived: false }).lean();
    const balances = await StockBalance.find({ companyId }).lean();

    const lowStockItems = items
      .map((item) => {
        const itemBalances = balances.filter(
          (b) => b.itemId.toString() === item._id.toString(),
        );
        const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity, 0);
        return { ...item, currentStock: totalStock };
      })
      .filter((item) => item.currentStock < item.minStockLevel);

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload or replace an item's image (PRD-INV-005/006)
// @route   POST /api/inventory/:id/image
// @access  Admin, Manager
exports.uploadItemImage = async (req, res, next) => {
  try {
    // multer has already processed the file and put it on req.file.
    // If multer rejected it (wrong type, too large), it called next(error) already.
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const item = await Item.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Build a publicly accessible URL path.
    // The /uploads static directory is served by app.js (see route registration).
    // In production swap this for your CDN or S3 presigned URL.
    const imageUrl = `/uploads/${req.file.filename}`;
    item.imageUrl = imageUrl;
    await item.save();

    res.status(200).json({
      message: "Image uploaded successfully",
      imageUrl,
      item,
    });
  } catch (error) {
    next(error);
  }
};

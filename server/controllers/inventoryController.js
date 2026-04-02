// server/controllers/inventoryController.js
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const Adjustment = require("../models/Adjustment"); // NEW IMPORT

// @desc    Get all items with their multi-location balances
// @route   GET /api/inventory
exports.getItems = async (req, res, next) => {
  try {
    const items = await Item.find({ isArchived: false }).lean();
    const balances = await StockBalance.find()
      .populate("locationId", "name type")
      .lean();

    const itemsWithBalances = items.map((item) => {
      const itemBalances = balances.filter(
        (b) => b.itemId.toString() === item._id.toString(),
      );
      const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity, 0);

      const secondaryStock = item.conversionFactor
        ? totalStock * item.conversionFactor
        : null;

      return {
        ...item,
        currentStock: totalStock,
        currentSecondaryStock: secondaryStock,
        balances: itemBalances,
      };
    });

    res.status(200).json(itemsWithBalances);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new item
// @route   POST /api/inventory
exports.createItem = async (req, res, next) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// @desc    Update item details
// @route   PUT /api/inventory/:id
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete / archive an item
// @route   PATCH /api/inventory/:id/archive
exports.archiveItem = async (req, res, next) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
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

    const balances = await StockBalance.find({ itemId });
    const hasActiveStock = balances.some((b) => b.quantity > 0);
    if (hasActiveStock) {
      return res.status(400).json({
        message:
          "PRD-INV-008 Violation: Cannot delete item because active stock persists.",
      });
    }

    const history = await Transaction.findOne({ itemId });
    if (history) {
      return res.status(400).json({
        message:
          "PRD-INV-008 Violation: Cannot delete item because historical movement records exist. Please archive the item instead.",
      });
    }

    const item = await Item.findByIdAndDelete(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json({ message: "Item permanently deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    Add stock to a specific location
// @route   POST /api/inventory/:id/stock
exports.addStock = async (req, res, next) => {
  try {
    const { locationId, quantityToAdd } = req.body;
    const itemId = req.params.id;

    if (!locationId || !quantityToAdd || quantityToAdd <= 0) {
      return res
        .status(400)
        .json({ message: "Valid Location and positive quantity required" });
    }

    let balance = await StockBalance.findOne({
      itemId,
      locationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (balance) {
      balance.quantity += Number(quantityToAdd);
      await balance.save();
    } else {
      balance = await StockBalance.create({
        itemId,
        locationId,
        quantity: Number(quantityToAdd),
      });
    }

    await Transaction.create({
      itemId,
      type: "addition",
      destinationLocationId: locationId,
      quantityChanged: quantityToAdd,
      newStockLevel: balance.quantity,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock added successfully", balance });
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
    const issueQty = Number(quantityToIssue);

    if (!locationId || !issueQty || issueQty <= 0) {
      return res
        .status(400)
        .json({ message: "Valid Location and positive quantity required" });
    }

    const balance = await StockBalance.findOne({
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

// @desc    Transfer stock
// @route   POST /api/inventory/:id/transfer
exports.transferStock = async (req, res, next) => {
  try {
    const { sourceLocationId, destinationLocationId, quantity } = req.body;
    const itemId = req.params.id;
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
        itemId,
        locationId: destinationLocationId,
        quantity: transferQty,
      });
    }

    await Transaction.create({
      itemId,
      type: "transfer",
      sourceLocationId,
      destinationLocationId,
      quantityChanged: transferQty,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock transferred successfully" });
  } catch (error) {
    next(error);
  }
};

// ── NEW: ADJUSTMENT WORKFLOW (PRD-INV-020 to 024) ──

// @desc    Get all adjustments (for Dashboard PRD-INV-002)
// @route   GET /api/inventory/adjustments
exports.getAdjustments = async (req, res, next) => {
  try {
    const adjustments = await Adjustment.find()
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

// @desc    Review (Approve/Reject) an adjustment (Executes stock change PRD-INV-024)
// @route   PATCH /api/inventory/adjustments/:id/review
exports.reviewAdjustment = async (req, res, next) => {
  try {
    const { action, reviewNotes } = req.body; // action must be 'approve' or 'reject'
    const adjustmentId = req.params.id;

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Action must be 'approve' or 'reject'" });
    }

    const adjustment = await Adjustment.findById(adjustmentId);

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

    // PRD-INV-024: Action is approve, execute stock level modification
    adjustment.status = "approved";

    let balance = await StockBalance.findOne({
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
        itemId: adjustment.itemId,
        locationId: adjustment.locationId,
        quantity: adjustment.quantityChange,
      });
    } else {
      if (balance.quantity + adjustment.quantityChange < 0) {
        return res
          .status(400)
          .json({
            message: "Cannot approve: Insufficient stock for this deduction.",
          });
      }
      balance.quantity += adjustment.quantityChange;
      await balance.save();
    }

    await adjustment.save();

    // Create tracking Transaction for the audit ledger
    await Transaction.create({
      itemId: adjustment.itemId,
      type: "adjustment",
      destinationLocationId: adjustment.locationId,
      quantityChanged: adjustment.quantityChange,
      newStockLevel: balance.quantity,
      performedBy: req.user._id,
    });

    res
      .status(200)
      .json({
        message: "Adjustment approved and stock updated",
        adjustment,
        balance,
      });
  } catch (error) {
    next(error);
  }
};

const mongoose = require("mongoose");
const crypto = require("crypto");
const Adjustment = require("../models/Adjustment");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const Location = require("../models/Location");
const AppError = require("../utils/AppError");

const checkAlerts = async (item, currentQuantity) => {
  if (!item || !item.alerts) return "UNKNOWN";
  if (currentQuantity <= item.alerts.redThreshold) return "RED";
  if (currentQuantity <= item.alerts.orangeThreshold) return "ORANGE";
  if (currentQuantity <= item.alerts.yellowThreshold) return "YELLOW";
  return "GREEN";
};

// --- PHASE 3: STOCK MOVEMENTS ---

exports.receiveStock = async (req, res, next) => {
  try {
    const {
      itemId,
      locationId,
      quantity,
      conversionRate = 1,
      batchNumber,
    } = req.body;
    const baseQuantity = quantity * conversionRate;

    let stock = await StockBalance.findOne({
      item: itemId,
      location: locationId,
      batchNumber: batchNumber || "N/A",
    }).populate("item");

    if (stock) {
      stock.quantity += baseQuantity;
      await stock.save();
    } else {
      stock = await StockBalance.create({
        item: itemId,
        location: locationId,
        quantity: baseQuantity,
        batchNumber: batchNumber || "N/A",
      });
      await stock.populate("item");
    }

    await Transaction.create({
      transactionId: `REC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      actionType: "Receipt",
      item: itemId,
      destinationLocation: locationId,
      quantityChanged: baseQuantity,
      batchNumber: batchNumber || "N/A",
      user: req.user.id,
    });

    const alertStatus = await checkAlerts(stock.item, stock.quantity);
    res
      .status(200)
      .json({
        status: "success",
        message: "Stock received.",
        alertStatus,
        data: stock,
      });
  } catch (error) {
    next(error);
  }
};

exports.issueStock = async (req, res, next) => {
  try {
    const { itemId, locationId, quantity, batchNumber } = req.body;
    const stock = await StockBalance.findOne({
      item: itemId,
      location: locationId,
      batchNumber: batchNumber || "N/A",
    }).populate("item");

    if (!stock)
      throw new AppError("No stock found for this item at this location.", 404);
    if (stock.quantity < quantity)
      throw new AppError(
        `Insufficient stock! Requested ${quantity}, available ${stock.quantity}.`,
        400,
      );

    stock.quantity -= quantity;
    await stock.save();

    await Transaction.create({
      transactionId: `ISS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      actionType: "Issue",
      item: itemId,
      sourceLocation: locationId,
      quantityChanged: quantity,
      batchNumber: batchNumber || "N/A",
      user: req.user.id,
    });

    const alertStatus = await checkAlerts(stock.item, stock.quantity);
    res
      .status(200)
      .json({
        status: "success",
        message: "Stock issued.",
        alertStatus,
        data: stock,
      });
  } catch (error) {
    next(error);
  }
};

exports.transferStock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      itemId,
      sourceLocationId,
      destinationLocationId,
      quantity,
      batchNumber,
    } = req.body;
    const sourceStock = await StockBalance.findOne({
      item: itemId,
      location: sourceLocationId,
      batchNumber: batchNumber || "N/A",
    }).session(session);

    if (!sourceStock || sourceStock.quantity < quantity)
      throw new AppError("Insufficient source stock.", 400);
    sourceStock.quantity -= quantity;
    await sourceStock.save({ session });

    let destStock = await StockBalance.findOne({
      item: itemId,
      location: destinationLocationId,
      batchNumber: batchNumber || "N/A",
    }).session(session);
    if (destStock) {
      destStock.quantity += quantity;
      await destStock.save({ session });
    } else {
      await StockBalance.create(
        [
          {
            item: itemId,
            location: destinationLocationId,
            quantity: quantity,
            batchNumber: batchNumber || "N/A",
          },
        ],
        { session },
      );
    }

    await Transaction.create(
      [
        {
          transactionId: `TRN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          actionType: "Transfer",
          item: itemId,
          sourceLocation: sourceLocationId,
          destinationLocation: destinationLocationId,
          quantityChanged: quantity,
          batchNumber: batchNumber || "N/A",
          user: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ status: "success", message: "Stock transferred." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

// --- PHASE 2: ADJUSTMENTS ---

exports.submitAdjustmentDraft = async (req, res, next) => {
  try {
    const { itemId, locationId, quantityChange, reason } = req.body;
    const adjustment = await Adjustment.create({
      item: itemId,
      location: locationId,
      quantityChange,
      reason,
      status: "Pending_Review",
      maker: req.user.id,
    });
    res
      .status(201)
      .json({
        status: "success",
        message: "Adjustment drafted.",
        data: adjustment,
      });
  } catch (error) {
    next(error);
  }
};

exports.approveAdjustment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const adjustment = await Adjustment.findById(
      req.params.adjustmentId,
    ).session(session);
    if (!adjustment || adjustment.status !== "Pending_Review")
      throw new AppError("Invalid or missing adjustment.", 400);

    adjustment.status = "Approved";
    adjustment.checker = req.user.id;
    await adjustment.save({ session });

    const stock = await StockBalance.findOne({
      item: adjustment.item,
      location: adjustment.location,
    }).session(session);
    if (!stock) throw new AppError("Stock record not found.", 404);

    stock.quantity += adjustment.quantityChange;
    await stock.save({ session });

    await Transaction.create(
      [
        {
          transactionId: `ADJ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          actionType: "Adjustment",
          item: adjustment.item,
          sourceLocation:
            adjustment.quantityChange < 0 ? adjustment.location : null,
          destinationLocation:
            adjustment.quantityChange > 0 ? adjustment.location : null,
          quantityChanged: Math.abs(adjustment.quantityChange),
          user: req.user.id,
          referenceDraft: adjustment._id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    res
      .status(200)
      .json({
        status: "success",
        message: "Adjustment approved.",
        data: stock,
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

exports.rejectAdjustment = async (req, res, next) => {
  try {
    const adjustment = await Adjustment.findByIdAndUpdate(
      req.params.adjustmentId,
      {
        status: "Rejected",
        checker: req.user.id,
        managerNotes: req.body.notes,
      },
      { new: true },
    );
    if (!adjustment) throw new AppError("Adjustment not found", 404);
    res
      .status(200)
      .json({
        status: "success",
        message: "Adjustment rejected.",
        data: adjustment,
      });
  } catch (error) {
    next(error);
  }
};

// --- ADVANCED FEATURES ---

exports.processReturn = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { itemId, quantity, condition, batchNumber } = req.body;
    let zoneType =
      condition === "restockable" ? "General Storage" : "Quarantine";
    const targetLocation = await Location.findOne({ zone: zoneType }).session(
      session,
    );
    if (!targetLocation)
      throw new AppError(`System lacks a ${zoneType} location.`, 500);

    let stock = await StockBalance.findOne({
      item: itemId,
      location: targetLocation._id,
      batchNumber: batchNumber || "N/A",
    }).session(session);
    if (stock) {
      stock.quantity += quantity;
      await stock.save({ session });
    } else {
      await StockBalance.create(
        [
          {
            item: itemId,
            location: targetLocation._id,
            quantity: quantity,
            batchNumber: batchNumber || "N/A",
          },
        ],
        { session },
      );
    }

    await Transaction.create(
      [
        {
          transactionId: `RET-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          actionType: "Receipt",
          item: itemId,
          destinationLocation: targetLocation._id,
          quantityChanged: quantity,
          batchNumber: batchNumber || "N/A",
          user: req.user.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
    res
      .status(200)
      .json({
        status: "success",
        message: `Returned items routed to ${zoneType}.`,
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

exports.logCycleCount = async (req, res, next) => {
  try {
    const { itemId, locationId, physicalCount } = req.body;
    const stock = await StockBalance.findOne({
      item: itemId,
      location: locationId,
    });
    const systemCount = stock ? stock.quantity : 0;
    const discrepancy = physicalCount - systemCount;

    if (discrepancy === 0)
      return res
        .status(200)
        .json({ status: "success", message: "Counts match." });

    const adjustmentDraft = await Adjustment.create({
      item: itemId,
      location: locationId,
      quantityChange: discrepancy,
      reason: `Cycle Count Discrepancy. System: ${systemCount}, Physical: ${physicalCount}.`,
      status: "Pending_Review",
      maker: req.user.id,
    });
    res
      .status(201)
      .json({
        status: "success",
        message: "Draft created for discrepancy.",
        data: adjustmentDraft,
      });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BARCODE / QR LOOKUP (NEW)
// ==========================================
exports.scanItem = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const item = await mongoose.model("Item").findOne({ sku });

    if (!item)
      return next(new AppError(`No item found with barcode/SKU: ${sku}`, 404));

    const stockBalances = await StockBalance.find({ item: item._id })
      .populate("location")
      .select("quantity location batchNumber");

    res.status(200).json({
      status: "success",
      data: { item, stock: stockBalances },
    });
  } catch (error) {
    next(error);
  }
};

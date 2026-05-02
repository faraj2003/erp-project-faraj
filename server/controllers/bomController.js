const mongoose = require("mongoose");
const crypto = require("crypto");
const BOM = require("../models/BOM");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

// 1. View all BOM Recipes
exports.getAllBOMs = async (req, res, next) => {
  try {
    const boms = await BOM.find()
      .populate("finishedGood", "name sku baseUnit")
      .populate("components.item", "name sku baseUnit");
    res.status(200).json({ status: "success", data: boms });
  } catch (error) {
    next(error);
  }
};

// 2. Create a new BOM Recipe
exports.createBOM = async (req, res, next) => {
  try {
    const { name, finishedGoodId, components } = req.body;
    const newBOM = await BOM.create({
      name,
      finishedGood: finishedGoodId,
      components,
    });
    res
      .status(201)
      .json({ status: "success", message: "BOM created.", data: newBOM });
  } catch (error) {
    if (error.code === 11000)
      return next(
        new AppError("A BOM already exists for this finished good.", 400),
      );
    next(error);
  }
};

// 3. Assemble a Kit (The Core Manufacturing Engine)
exports.assembleKit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bomId, buildQuantity, sourceLocationId, destinationLocationId } =
      req.body;

    const bom = await BOM.findById(bomId).session(session);
    if (!bom) throw new AppError("BOM not found.", 404);

    const transactionBatchId = `ASM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const transactionsToLog = [];

    // STEP A: Validate and Deduct all raw materials
    for (const component of bom.components) {
      const totalNeeded = component.quantityRequired * buildQuantity;

      const sourceStock = await StockBalance.findOne({
        item: component.item,
        location: sourceLocationId,
      }).session(session);

      if (!sourceStock || sourceStock.quantity < totalNeeded) {
        throw new AppError(
          `Insufficient stock for component ID: ${component.item}. Need ${totalNeeded}, but only have ${sourceStock ? sourceStock.quantity : 0}.`,
          400,
        );
      }

      // Deduct raw material
      sourceStock.quantity -= totalNeeded;
      await sourceStock.save({ session });

      // Queue the deduction transaction
      transactionsToLog.push({
        transactionId: `${transactionBatchId}-OUT-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
        actionType: "Issue",
        item: component.item,
        sourceLocation: sourceLocationId,
        quantityChanged: totalNeeded,
        user: req.user.id,
      });
    }

    // STEP B: Add the Finished Good to inventory
    let destStock = await StockBalance.findOne({
      item: bom.finishedGood,
      location: destinationLocationId,
    }).session(session);

    if (destStock) {
      destStock.quantity += buildQuantity;
      await destStock.save({ session });
    } else {
      await StockBalance.create(
        [
          {
            item: bom.finishedGood,
            location: destinationLocationId,
            quantity: buildQuantity,
          },
        ],
        { session },
      );
    }

    // Queue the creation transaction
    transactionsToLog.push({
      transactionId: `${transactionBatchId}-IN-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      actionType: "Receipt",
      item: bom.finishedGood,
      destinationLocation: destinationLocationId,
      quantityChanged: buildQuantity,
      user: req.user.id,
    });

    // STEP C: Save all transaction logs
    await Transaction.insertMany(transactionsToLog, { session });

    // Commit everything
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: `Successfully assembled ${buildQuantity} units of the finished good.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

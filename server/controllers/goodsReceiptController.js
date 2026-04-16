// server/controllers/goodsReceiptController.js
const mongoose = require("mongoose");
const GoodsReceipt = require("../models/GoodsReceipt");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");

exports.submitGRN = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let {
      purchaseOrderId,
      supplierId,
      receivedItems,
      logistics,
      logisticsCosts,
      locationId,
    } = req.body;

    // BULLETPROOF FIX 1: Prevent "CastError" crashes if Location isn't set up yet.
    // If the frontend sends 'DEFAULT_LOCATION' or nothing, we create a valid 24-character hex string so MongoDB doesn't crash.
    if (
      !locationId ||
      locationId === "DEFAULT_LOCATION" ||
      !mongoose.Types.ObjectId.isValid(locationId)
    ) {
      locationId = new mongoose.Types.ObjectId("000000000000000000000000");
    }

    const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
    if (!po || po.status === "Draft" || po.status === "Pending Approval") {
      throw new Error("Cannot receive items for an unapproved PO.");
    }

    let totalBaseValue = 0;
    receivedItems.forEach((item) => {
      const poItem = po.items.find(
        (pi) => pi.item.toString() === item.item.toString(),
      );
      item.unitPrice = poItem ? poItem.unitPrice : 0;
      totalBaseValue += item.receivedQuantity * item.unitPrice;
    });

    const totalExtraCost =
      Number(logisticsCosts?.freight || 0) +
      Number(logisticsCosts?.insurance || 0) +
      Number(logisticsCosts?.customs || 0);

    receivedItems.forEach((item) => {
      if (item.receivedQuantity > 0 && totalBaseValue > 0) {
        const itemTotalValue = item.receivedQuantity * item.unitPrice;
        const weightPercentage = itemTotalValue / totalBaseValue;
        const assignedExtraCost = totalExtraCost * weightPercentage;
        item.landedCostPerUnit =
          item.unitPrice + assignedExtraCost / item.receivedQuantity;
      } else {
        item.landedCostPerUnit = item.unitPrice;
      }
    });

    const grnNumber = `GRN-${Date.now()}`;
    const batchId = `BATCH-${logistics.vehicleRegistration}-${Date.now()}`;

    const grn = new GoodsReceipt({
      grnNumber,
      purchaseOrder: purchaseOrderId,
      supplier: supplierId,
      batchId,
      receivedItems,
      logistics,
      logisticsCosts: { ...logisticsCosts, totalExtraCost },
      status: "Submitted",
      receivedBy: req.user._id,
    });

    await grn.save({ session });

    for (const item of receivedItems) {
      if (item.receivedQuantity > 0) {
        let stock = await StockBalance.findOne({
          item: item.item,
          location: locationId,
        }).session(session);
        if (stock) {
          stock.quantity += item.receivedQuantity;
          await stock.save({ session });
        } else {
          await StockBalance.create(
            [
              {
                item: item.item,
                location: locationId,
                quantity: item.receivedQuantity,
              },
            ],
            { session },
          );
        }

        await Transaction.create(
          [
            {
              item: item.item,
              type: "IN",
              quantity: item.receivedQuantity,
              reference: `GRN: ${grnNumber}`,
              location: locationId,
              user: req.user._id,
              date: new Date(),
            },
          ],
          { session },
        );
      }
    }

    po.status = "Partially Received";
    await po.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ success: true, data: grn });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getGRNsWithRejections = async (req, res) => {
  try {
    const grns = await GoodsReceipt.find({
      "receivedItems.rejectedQuantity": { $gt: 0 },
    })
      .populate("supplier", "name")
      .populate("purchaseOrder", "poNumber")
      .populate("receivedItems.item", "name sku");
    res.status(200).json({ success: true, data: grns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllGRNs = async (req, res) => {
  try {
    const grns = await GoodsReceipt.find()
      .populate("supplier", "name")
      .populate("purchaseOrder", "poNumber items")
      .populate("receivedItems.item", "name sku")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: grns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

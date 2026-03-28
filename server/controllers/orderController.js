// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Location = require("../models/Location");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("managerId", "name email role")
      .populate("locationId", "name type")
      .populate("inputs.itemId", "name sku unit")
      .populate("outputs.itemId", "name sku unit")
      .populate("statusHistory.changedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { total: orders.length, page: 1, totalPages: 1 },
    });
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { orderNumber, notes, inputs, outputs, locationId } = req.body;

    if (!locationId)
      throw new AppError("A Shop/Location must be assigned to this order", 400);

    let totalMaterialCost = 0;
    let totalProductionValue = 0;

    const enrichedInputs = await Promise.all(
      inputs.map(async (input) => {
        const item = await Item.findById(input.itemId);
        totalMaterialCost += (item.costPerUnit || 0) * input.quantityRequired;
        return { ...input, unitCost: item.costPerUnit || 0 };
      }),
    );

    const enrichedOutputs = await Promise.all(
      outputs.map(async (output) => {
        const item = await Item.findById(output.itemId);
        totalProductionValue +=
          (item.valuePerUnit || 0) * output.quantityProduced;
        return { ...output, unitValue: item.valuePerUnit || 0 };
      }),
    );

    const order = await Order.create({
      orderNumber,
      managerId: req.user._id,
      locationId,
      notes,
      inputs: enrichedInputs,
      outputs: enrichedOutputs,
      financials: { totalMaterialCost, totalProductionValue },
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

exports.completeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, actuals } = req.body; // actuals = [{ itemId, utilized, scrapped }]
    const order = await Order.findById(req.params.id).session(session);

    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "Completed")
      throw new AppError("Order already completed", 400);

    order.statusHistory.push({
      status,
      changedBy: req.user._id,
      timestamp: new Date(),
    });

    // If just updating status to In Progress, etc.
    if (status !== "Completed") {
      order.status = status;
      await order.save({ session });
      await session.commitTransaction();
      return res.status(200).json({ success: true, data: order });
    }

    // ── INVENTORY MATH FOR COMPLETION (MULTI-LOCATION & SCRAP) ──

    // Ensure we have a Scrap Location
    let scrapLocation = await Location.findOne({ type: "Scrap" }).session(
      session,
    );
    if (!scrapLocation) {
      scrapLocation = await Location.create(
        [{ name: "Main Scrap Yard", type: "Scrap" }],
        { session },
      );
      scrapLocation = scrapLocation[0];
    }

    // 1. Process Inputs (Deduct from Shop, Move scrap to Scrap Yard)
    for (let i = 0; i < order.inputs.length; i++) {
      const input = order.inputs[i];
      const actualData = actuals?.find(
        (a) => a.itemId === input.itemId.toString(),
      );

      const utilized = actualData
        ? Number(actualData.utilized)
        : input.quantityRequired;
      const scrapped = actualData ? Number(actualData.scrapped) : 0;
      const totalConsumed = utilized + scrapped;

      input.quantityUtilized = utilized;
      input.quantityScrapped = scrapped;

      // Find stock at the Shop
      const shopBalance = await StockBalance.findOne({
        itemId: input.itemId,
        locationId: order.locationId,
      }).session(session);

      if (!shopBalance || shopBalance.quantity < totalConsumed) {
        throw new AppError(
          `Not enough stock at the shop to consume ${totalConsumed} units of item ${input.itemId}`,
          400,
        );
      }

      // Deduct total consumed from Shop
      shopBalance.quantity -= totalConsumed;
      await shopBalance.save({ session });
      await Transaction.create(
        [
          {
            itemId: input.itemId,
            orderId: order._id,
            type: "shop_consumption",
            sourceLocationId: order.locationId,
            quantityChanged: totalConsumed,
            performedBy: req.user._id,
          },
        ],
        { session },
      );

      // If scrapped, add to Scrap Location
      if (scrapped > 0) {
        let scrapBalance = await StockBalance.findOne({
          itemId: input.itemId,
          locationId: scrapLocation._id,
        }).session(session);
        if (scrapBalance) {
          scrapBalance.quantity += scrapped;
          await scrapBalance.save({ session });
        } else {
          await StockBalance.create(
            [
              {
                itemId: input.itemId,
                locationId: scrapLocation._id,
                quantity: scrapped,
              },
            ],
            { session },
          );
        }
        await Transaction.create(
          [
            {
              itemId: input.itemId,
              orderId: order._id,
              type: "scrap_return",
              sourceLocationId: order.locationId,
              destinationLocationId: scrapLocation._id,
              quantityChanged: scrapped,
              performedBy: req.user._id,
            },
          ],
          { session },
        );
      }
    }

    // 2. Process Outputs (Add finished goods to the Shop)
    for (const output of order.outputs) {
      let destBalance = await StockBalance.findOne({
        itemId: output.itemId,
        locationId: order.locationId,
      }).session(session);
      if (destBalance) {
        destBalance.quantity += output.quantityProduced;
        await destBalance.save({ session });
      } else {
        await StockBalance.create(
          [
            {
              itemId: output.itemId,
              locationId: order.locationId,
              quantity: output.quantityProduced,
            },
          ],
          { session },
        );
      }
      await Transaction.create(
        [
          {
            itemId: output.itemId,
            orderId: order._id,
            type: "addition",
            destinationLocationId: order.locationId,
            quantityChanged: output.quantityProduced,
            performedBy: req.user._id,
          },
        ],
        { session },
      );
    }

    order.status = "Completed";
    await order.save({ session });
    await session.commitTransaction();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

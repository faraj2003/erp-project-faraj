// server/controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Location = require("../models/Location");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

// Helper function to calculate multiplier based on requested unit
const getMultiplier = (item, requestedUnit) => {
  if (
    !requestedUnit ||
    !item.baseUnit ||
    requestedUnit.toLowerCase() === item.baseUnit.toLowerCase()
  ) {
    return 1;
  }
  const secUnit = item.secondaryUnits?.find(
    (u) => u.name.toLowerCase() === requestedUnit.toLowerCase(),
  );
  return secUnit ? secUnit.multiplierToBase : 1;
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("managerId", "name email role")
      .populate("locationId", "name type")
      .populate("inputs.itemId", "name sku unit baseUnit")
      .populate("outputs.itemId", "name sku unit baseUnit")
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
    const companyId = req.companyId;

    if (!locationId)
      throw new AppError("A Shop/Location must be assigned to this order", 400);

    let totalMaterialCost = 0;
    let totalProductionValue = 0;

    // Enforce base math during creation for accurate financial forecasting
    const enrichedInputs = await Promise.all(
      inputs.map(async (input) => {
        const item = await Item.findOne({ _id: input.itemId, companyId });
        if (!item)
          throw new AppError(`Input item ${input.itemId} not found`, 404);

        const multiplier = getMultiplier(item, input.unit);
        const baseQty = input.quantityRequired * multiplier;

        totalMaterialCost += (item.costPerUnit || 0) * baseQty;
        return { ...input, unitCost: item.costPerUnit || 0 };
      }),
    );

    const enrichedOutputs = await Promise.all(
      outputs.map(async (output) => {
        const item = await Item.findOne({ _id: output.itemId, companyId });
        if (!item)
          throw new AppError(`Output item ${output.itemId} not found`, 404);

        const multiplier = getMultiplier(item, output.unit);
        const baseQty = output.quantityProduced * multiplier;

        totalProductionValue += (item.valuePerUnit || 0) * baseQty;
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
    const companyId = req.companyId;

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

    // ── INVENTORY MATH FOR COMPLETION (MULTI-LOCATION, SCRAP & UNIT CONVERSION) ──

    // Ensure we have a Scrap Location for this specific company
    let scrapLocation = await Location.findOne({
      companyId,
      type: "Scrap",
    }).session(session);
    if (!scrapLocation) {
      const newScrap = await Location.create(
        [{ companyId, name: "Main Scrap Yard", type: "Scrap" }],
        { session },
      );
      scrapLocation = newScrap[0];
    }

    // 1. Process Inputs (Deduct from Shop, Move scrap to Scrap Yard)
    for (let i = 0; i < order.inputs.length; i++) {
      const input = order.inputs[i];
      const actualData = actuals?.find(
        (a) => a.itemId === input.itemId.toString(),
      );

      const itemDoc = await Item.findOne({
        _id: input.itemId,
        companyId,
      }).session(session);
      if (!itemDoc)
        throw new AppError(`Item not found for input: ${input.itemId}`, 404);

      // Fetch multiplier to convert secondary units to base units
      const multiplier = getMultiplier(itemDoc, input.unit);

      // Quantities logged in the provided unit
      const utilized = actualData
        ? Number(actualData.utilized)
        : input.quantityRequired;
      const scrapped = actualData ? Number(actualData.scrapped) : 0;
      const totalConsumed = utilized + scrapped;

      // Base Quantities for Database Stock Management
      const baseUtilized = utilized * multiplier;
      const baseScrapped = scrapped * multiplier;
      const baseTotalConsumed = totalConsumed * multiplier;

      input.quantityUtilized = utilized;
      input.quantityScrapped = scrapped;

      // Find stock at the Shop
      const shopBalance = await StockBalance.findOne({
        companyId,
        itemId: input.itemId,
        locationId: order.locationId,
      }).session(session);

      if (!shopBalance || shopBalance.quantity < baseTotalConsumed) {
        throw new AppError(
          `Not enough stock at the shop to consume ${baseTotalConsumed} base units of item ${itemDoc.name}`,
          400,
        );
      }

      // Deduct total consumed base units from Shop
      shopBalance.quantity -= baseTotalConsumed;
      await shopBalance.save({ session });

      await Transaction.create(
        [
          {
            companyId,
            itemId: input.itemId,
            orderId: order._id,
            type: "shop_consumption",
            sourceLocationId: order.locationId,
            quantityChanged: baseTotalConsumed,
            performedBy: req.user._id,
          },
        ],
        { session },
      );

      // If scrapped, add to Scrap Location in BASE UNITS
      if (baseScrapped > 0) {
        let scrapBalance = await StockBalance.findOne({
          companyId,
          itemId: input.itemId,
          locationId: scrapLocation._id,
        }).session(session);

        if (scrapBalance) {
          scrapBalance.quantity += baseScrapped;
          await scrapBalance.save({ session });
        } else {
          await StockBalance.create(
            [
              {
                companyId,
                itemId: input.itemId,
                locationId: scrapLocation._id,
                quantity: baseScrapped,
              },
            ],
            { session },
          );
        }
        await Transaction.create(
          [
            {
              companyId,
              itemId: input.itemId,
              orderId: order._id,
              type: "scrap_return",
              sourceLocationId: order.locationId,
              destinationLocationId: scrapLocation._id,
              quantityChanged: baseScrapped,
              performedBy: req.user._id,
            },
          ],
          { session },
        );
      }
    }

    // 2. Process Outputs (Add finished goods to the Shop)
    for (const output of order.outputs) {
      const itemDoc = await Item.findOne({
        _id: output.itemId,
        companyId,
      }).session(session);
      if (!itemDoc)
        throw new AppError(`Item not found for output: ${output.itemId}`, 404);

      // Convert produced secondary units into base units
      const multiplier = getMultiplier(itemDoc, output.unit);
      const baseProduced = output.quantityProduced * multiplier;

      let destBalance = await StockBalance.findOne({
        companyId,
        itemId: output.itemId,
        locationId: order.locationId,
      }).session(session);

      if (destBalance) {
        destBalance.quantity += baseProduced;
        await destBalance.save({ session });
      } else {
        await StockBalance.create(
          [
            {
              companyId,
              itemId: output.itemId,
              locationId: order.locationId,
              quantity: baseProduced,
            },
          ],
          { session },
        );
      }

      await Transaction.create(
        [
          {
            companyId,
            itemId: output.itemId,
            orderId: order._id,
            type: "addition",
            destinationLocationId: order.locationId,
            quantityChanged: baseProduced,
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

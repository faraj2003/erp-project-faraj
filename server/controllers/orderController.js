// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Item = require("../models/Item");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// @desc    Get all production orders (paginated, with status filter)
// @route   GET /api/orders
// @access  Private (All authenticated users)
const getOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      const validStatuses = [
        "Pending",
        "In Progress",
        "Completed",
        "Cancelled",
      ];
      if (!validStatuses.includes(req.query.status)) {
        return next(
          new AppError(
            `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            400,
          ),
        );
      }
      filter.status = req.query.status;
    }

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate("managerId", "name email role")
        .populate("inputs.itemId", "name sku unit")
        .populate("outputs.itemId", "name sku unit")
        .populate("statusHistory.changedBy", "name") // <-- Populate audit trail user names
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a new production order
// @route   POST /api/orders
// @access  Private (Managers & Admins only)
const createOrder = async (req, res, next) => {
  try {
    const { orderNumber, notes, inputs, outputs } = req.body;

    let totalMaterialCost = 0;
    let totalProductionValue = 0;

    // ── Snapshot Costs for Inputs ──
    const enrichedInputs = await Promise.all(
      inputs.map(async (input) => {
        const item = await Item.findById(input.itemId);
        if (!item)
          throw new AppError(`Item with ID ${input.itemId} not found`, 404);

        const cost = item.costPerUnit || 0;
        totalMaterialCost += cost * input.quantityRequired;

        return { ...input, unitCost: cost };
      }),
    );

    // ── Snapshot Values for Outputs ──
    const enrichedOutputs = await Promise.all(
      outputs.map(async (output) => {
        const item = await Item.findById(output.itemId);
        if (!item)
          throw new AppError(`Item with ID ${output.itemId} not found`, 404);

        const value = item.valuePerUnit || 0;
        totalProductionValue += value * output.quantityProduced;

        return { ...output, unitValue: value };
      }),
    );

    const order = await Order.create({
      orderNumber,
      managerId: req.user._id,
      status: "Pending",
      notes,
      inputs: enrichedInputs,
      outputs: enrichedOutputs,
      financials: { totalMaterialCost, totalProductionValue },
    });
    // Note: The pre-save hook in Order.js automatically creates the first statusHistory entry!

    logger.info(
      `[Orders] New order created: ${order.orderNumber} by ${req.user._id}`,
    );
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status and trigger inventory sync if completed
// @route   PATCH /api/orders/:id/status
// @access  Private (Managers & Admins only)
const completeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).session(session);

    if (!order) throw new AppError("Order not found", 404);
    if (order.status === "Completed")
      throw new AppError(
        "Order is already completed and cannot be changed",
        400,
      );
    if (order.status === "Cancelled")
      throw new AppError("Order is cancelled and cannot be changed", 400);

    // ── Audit Trail Update ──
    order.statusHistory.push({
      status: status,
      changedBy: req.user._id,
      timestamp: new Date(),
    });

    if (status !== "Completed") {
      order.status = status;
      await order.save({ session });
      await session.commitTransaction();

      logger.info(
        `[Orders] Order status updated to ${status}: ${order.orderNumber}`,
      );
      return res.status(200).json({ success: true, data: order });
    }

    // ── Inventory Math for "Completed" Status ──
    for (const input of order.inputs) {
      const item = await Item.findById(input.itemId).session(session);
      if (!item)
        throw new AppError(`Item with ID ${input.itemId} not found`, 404);
      if (item.currentStock < input.quantityRequired) {
        throw new AppError(
          `Insufficient stock for '${item.name}'. Required: ${input.quantityRequired}, Available: ${item.currentStock}`,
          400,
        );
      }

      item.currentStock -= input.quantityRequired;
      await item.save({ session });

      await Transaction.create(
        [
          {
            itemId: item._id,
            orderId: order._id,
            type: "deduction",
            quantityChanged: input.quantityRequired,
            newStockLevel: item.currentStock,
            performedBy: req.user._id,
          },
        ],
        { session },
      );
    }

    for (const output of order.outputs) {
      const item = await Item.findById(output.itemId).session(session);
      if (!item)
        throw new AppError(`Item with ID ${output.itemId} not found`, 404);

      item.currentStock += output.quantityProduced;
      await item.save({ session });

      await Transaction.create(
        [
          {
            itemId: item._id,
            orderId: order._id,
            type: "addition",
            quantityChanged: output.quantityProduced,
            newStockLevel: item.currentStock,
            performedBy: req.user._id,
          },
        ],
        { session },
      );
    }

    order.status = "Completed";
    await order.save({ session });
    await session.commitTransaction();

    logger.info(`[Orders] Order completed: ${order.orderNumber}`);

    const io = req.app.get("io");
    if (io) {
      io.emit("inventory_updated", {
        message: "Inventory updated.",
        orderId: order._id,
      });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = { getOrders, createOrder, completeOrder };

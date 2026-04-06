// server/controllers/analyticsController.js
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");
const Item = require("../models/Item");
const AppError = require("../utils/AppError");

// @desc    Get total production metrics grouped by item
// @route   GET /api/analytics/production
// @access  Private (Admin/Manager)
exports.getProductionMetrics = async (req, res, next) => {
  try {
    const companyId = req.companyId;

    const production = await Transaction.aggregate([
      { $match: { companyId, type: "addition", orderId: { $ne: null } } },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemData",
        },
      },
      { $unwind: "$itemData" },
      {
        $group: {
          _id: "$itemData.name",
          totalProduced: { $sum: "$quantityChanged" },
        },
      },
      { $sort: { totalProduced: -1 } },
    ]);

    res.status(200).json({ success: true, data: production });
  } catch (error) {
    next(error);
  }
};

// @desc    Get general stock additions vs deductions
// @route   GET /api/analytics/stock-movement
// @access  Private (Admin/Manager)
exports.getStockMovementMetrics = async (req, res, next) => {
  try {
    const companyId = req.companyId;

    const movement = await Transaction.aggregate([
      { $match: { companyId } },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemData",
        },
      },
      { $unwind: "$itemData" },
      {
        $group: {
          _id: "$itemData.name",
          added: {
            $sum: {
              $cond: [
                { $in: ["$type", ["addition", "scrap_return"]] },
                "$quantityChanged",
                0,
              ],
            },
          },
          deducted: {
            $sum: {
              $cond: [
                { $in: ["$type", ["deduction", "shop_consumption"]] },
                "$quantityChanged",
                0,
              ],
            },
          },
        },
      },
      { $sort: { added: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory consumption trends and velocity
// @route   GET /api/analytics/trends
// @access  Private (Admin/Manager)
exports.getInventoryTrends = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { days = 30 } = req.query;

    const parsedDays = parseInt(days, 10);
    if (isNaN(parsedDays) || parsedDays <= 0) {
      throw new AppError("Days parameter must be a positive number", 400);
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parsedDays);

    const transactions = await Transaction.find({
      companyId,
      createdAt: { $gte: dateLimit },
      type: { $in: ["deduction", "shop_consumption", "scrap_return"] },
    })
      .populate("itemId", "name sku baseUnit")
      .lean();

    const velocityMap = {};

    transactions.forEach((txn) => {
      if (!txn.itemId) return;

      const itemId = txn.itemId._id.toString();

      if (!velocityMap[itemId]) {
        velocityMap[itemId] = {
          item: txn.itemId,
          totalConsumed: 0,
          transactionCount: 0,
        };
      }

      velocityMap[itemId].totalConsumed += txn.quantityChanged;
      velocityMap[itemId].transactionCount += 1;
    });

    const trends = Object.values(velocityMap).map((data) => ({
      item: data.item,
      metrics: {
        totalConsumed: data.totalConsumed,
        averageDailyConsumption: parseFloat(
          (data.totalConsumed / parsedDays).toFixed(2),
        ),
        transactionCount: data.transactionCount,
      },
    }));

    trends.sort((a, b) => b.metrics.totalConsumed - a.metrics.totalConsumed);

    res
      .status(200)
      .json({ success: true, periodDays: parsedDays, data: trends });
  } catch (error) {
    next(error);
  }
};

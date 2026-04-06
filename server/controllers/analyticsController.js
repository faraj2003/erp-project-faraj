// server/controllers/analyticsController.js
const Transaction = require("../models/Transaction");
const Item = require("../models/Item");
const AppError = require("../utils/AppError");

// @desc    Get inventory consumption trends and velocity
// @route   GET /api/analytics/trends
// @access  Private (Admin/Manager)
exports.getInventoryTrends = async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const { days = 30 } = req.query; // Default to a 30-day lookback period

    const parsedDays = parseInt(days, 10);
    if (isNaN(parsedDays) || parsedDays <= 0) {
      throw new AppError("Days parameter must be a positive number", 400);
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parsedDays);

    // PRD-INV-025 to 028: Fetch transactions that indicate consumption/usage
    const transactions = await Transaction.find({
      companyId,
      createdAt: { $gte: dateLimit },
      type: { $in: ["deduction", "shop_consumption", "scrap_return"] },
    })
      .populate("itemId", "name sku baseUnit")
      .lean();

    // Calculate consumption velocity per item
    const velocityMap = {};

    transactions.forEach((txn) => {
      // Skip if item was deleted/orphaned
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

    // Format the response into a clean array of analytical data
    const trends = Object.values(velocityMap).map((data) => ({
      item: {
        id: data.item._id,
        name: data.item.name,
        sku: data.item.sku,
        baseUnit: data.item.baseUnit,
      },
      metrics: {
        totalConsumed: data.totalConsumed,
        // Calculate velocity (average used per day)
        averageDailyConsumption: parseFloat(
          (data.totalConsumed / parsedDays).toFixed(2),
        ),
        transactionCount: data.transactionCount,
      },
    }));

    // Sort by highest total consumption to highlight fastest-moving items
    trends.sort((a, b) => b.metrics.totalConsumed - a.metrics.totalConsumed);

    res.status(200).json({
      success: true,
      periodDays: parsedDays,
      analyzedSince: dateLimit.toISOString(),
      data: trends,
    });
  } catch (error) {
    next(error);
  }
};

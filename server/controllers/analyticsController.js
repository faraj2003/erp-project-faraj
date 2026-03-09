// controllers/analyticsController.js
const Transaction = require("../models/Transaction");

// @desc    Get total production per item (bar chart data)
// @route   GET /api/analytics/production
// @access  Private (Admins Only)
const getProductionMetrics = async (req, res, next) => {
  try {
    const metrics = await Transaction.aggregate([
      { $match: { type: "addition" } },
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },
      {
        $group: {
          _id: "$itemDetails.name",
          totalProduced: { $sum: "$quantityChanged" },
          lastProductionDate: { $max: "$createdAt" },
        },
      },
      { $sort: { totalProduced: -1 } },
    ]);

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly production volume trend (line chart data)
// @route   GET /api/analytics/trends
// @access  Private (Admins Only)
const getMonthlyTrends = async (req, res, next) => {
  try {
    const trends = await Transaction.aggregate([
      { $match: { type: "addition" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalProduced: { $sum: "$quantityChanged" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id: 0,
          // Format as "Jan 2026" for chart x-axis labels
          month: {
            $dateToString: {
              format: "%b %Y",
              date: {
                $dateFromParts: {
                  year: "$_id.year",
                  month: "$_id.month",
                  day: 1,
                },
              },
            },
          },
          totalProduced: 1,
          orderCount: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory deduction vs addition summary
// @route   GET /api/analytics/stock-movement
// @access  Private (Admins Only)
const getStockMovement = async (req, res, next) => {
  try {
    const movement = await Transaction.aggregate([
      {
        $lookup: {
          from: "items",
          localField: "itemId",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },
      {
        $group: {
          _id: {
            name: "$itemDetails.name",
            type: "$type",
          },
          total: { $sum: "$quantityChanged" },
        },
      },
      {
        $group: {
          _id: "$_id.name",
          added: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "addition"] }, "$total", 0],
            },
          },
          deducted: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "deduction"] }, "$total", 0],
            },
          },
        },
      },
      { $sort: { added: -1 } },
    ]);

    res.status(200).json({ success: true, data: movement });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductionMetrics, getMonthlyTrends, getStockMovement };

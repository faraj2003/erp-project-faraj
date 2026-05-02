const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const StockBalance = require("../models/StockBalance");
const Item = require("../models/Item");
const AppError = require("../utils/AppError");

exports.getInventoryReports = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Inventory Valuation & Total Stock
    // Note: Since we didn't define a 'price' field earlier, we will calculate total volume.
    // If you add a 'unitCost' to the Item model later, you can multiply it here.
    const stockAggregations = await StockBalance.aggregate([
      {
        $group: {
          _id: null,
          totalItemsInStock: { $sum: "$quantity" },
          uniqueLocationsActive: { $addToSet: "$location" },
        },
      },
    ]);

    const totalStock =
      stockAggregations.length > 0 ? stockAggregations[0].totalItemsInStock : 0;

    // 2. Fast / Slow Moving Items (Based on 'Issue' transactions in the last 30 days)
    const movementVelocity = await Transaction.aggregate([
      {
        $match: {
          actionType: "Issue",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$item",
          totalIssued: { $sum: "$quantityChanged" },
          issueFrequency: { $sum: 1 },
        },
      },
      { $sort: { totalIssued: -1 } },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: "$itemDetails" },
      {
        $project: {
          name: "$itemDetails.name",
          sku: "$itemDetails.sku",
          totalIssued: 1,
          issueFrequency: 1,
        },
      },
    ]);

    const fastMoving = movementVelocity.slice(0, 5); // Top 5
    const slowMoving = movementVelocity.slice(-5).reverse(); // Bottom 5

    // 3. Historical Stock Movement Trends (Last 7 Days Activity)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const historicalTrends = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalMovements: { $sum: 1 },
          volumeHandled: { $sum: "$quantityChanged" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        overview: {
          totalStockVolume: totalStock,
          activeLocations:
            stockAggregations.length > 0
              ? stockAggregations[0].uniqueLocationsActive.length
              : 0,
        },
        velocity: {
          fastMoving,
          slowMoving,
        },
        trends: historicalTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

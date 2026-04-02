// server/controllers/analyticsController.js
const Transaction = require("../models/Transaction");
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const Adjustment = require("../models/Adjustment"); // Requires the Adjustment model from Step 3

// --- EXISTING ENDPOINTS ---

// @desc    Get total production per item (bar chart data)
// @route   GET /api/analytics/production
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
            $sum: { $cond: [{ $eq: ["$_id.type", "addition"] }, "$total", 0] },
          },
          deducted: {
            $sum: { $cond: [{ $eq: ["$_id.type", "deduction"] }, "$total", 0] },
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

// ── NEW: DASHBOARD & REPORTING ENDPOINTS (PRD-INV-001, 002, 039, 040) ──

// @desc    Get top-level dashboard metrics (Valuation, Alerts, Pending Adjustments)
// @route   GET /api/analytics/dashboard
const getDashboardMetrics = async (req, res, next) => {
  try {
    const items = await Item.find({ isArchived: false }).lean();
    const balances = await StockBalance.find().lean();

    let totalValuation = 0;
    const lowStockAlerts = [];

    // Calculate total stock and valuation across all locations
    items.forEach((item) => {
      const itemBalances = balances.filter(
        (b) => b.itemId.toString() === item._id.toString(),
      );
      const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity, 0);

      // Add to total valuation (PRD-INV-001)
      totalValuation += totalStock * (item.valuePerUnit || 0);

      // Check low stock threshold (PRD-INV-001)
      if (totalStock <= item.minStockLevel) {
        lowStockAlerts.push({
          itemId: item._id,
          sku: item.sku,
          name: item.name,
          currentStock: totalStock,
          minStockLevel: item.minStockLevel,
        });
      }
    });

    // Fetch pending adjustments (PRD-INV-002)
    const pendingAdjustments = await Adjustment.find({ status: "pending" })
      .populate("itemId", "name sku")
      .populate("locationId", "name")
      .populate("requestedBy", "name")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalItemsCount: items.length,
        totalValuation,
        lowStockAlerts,
        pendingAdjustmentsCount: pendingAdjustments.length,
        pendingAdjustments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Immutable Stock Ledger (Audit Trail)
// @route   GET /api/analytics/ledger
const getStockLedger = async (req, res, next) => {
  try {
    // PRD-INV-039: Comprehensive, immutable historical log
    const ledger = await Transaction.find()
      .populate("itemId", "name sku")
      .populate("sourceLocationId", "name")
      .populate("destinationLocationId", "name")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Stock Ledger to CSV
// @route   GET /api/analytics/ledger/export
const exportStockLedgerCSV = async (req, res, next) => {
  try {
    const ledger = await Transaction.find()
      .populate("itemId", "name sku")
      .populate("sourceLocationId", "name")
      .populate("destinationLocationId", "name")
      .populate("performedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // PRD-INV-040: Data Portability to CSV
    const headers = [
      "Transaction ID",
      "Date",
      "Item SKU",
      "Item Name",
      "Transaction Type",
      "Quantity Changed",
      "Source Location",
      "Destination Location",
      "Performed By",
    ];

    const rows = ledger.map((t) => [
      t.transactionId,
      new Date(t.createdAt).toISOString(),
      t.itemId?.sku || "N/A",
      t.itemId?.name || "N/A",
      t.type.toUpperCase(),
      t.quantityChanged,
      t.sourceLocationId?.name || "N/A",
      t.destinationLocationId?.name || "N/A",
      t.performedBy?.name || "System",
    ]);

    // Format as comma-separated string, escaping quotes
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=stock_ledger.csv",
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProductionMetrics,
  getMonthlyTrends,
  getStockMovement,
  getDashboardMetrics,
  getStockLedger,
  exportStockLedgerCSV,
};

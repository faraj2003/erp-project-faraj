// server/controllers/procurementExtrasController.js
const PurchaseOrder = require("../models/PurchaseOrder");
const GoodsReceipt = require("../models/GoodsReceipt");
const StockBalance = require("../models/StockBalance");

// @desc    Get Procurement Dashboard Stats (Point 7)
// @route   GET /api/procurement/stats
exports.getProcurementStats = async (req, res) => {
  try {
    // 1. Count pending approvals
    const pendingPOsCount = await PurchaseOrder.countDocuments({
      status: "Pending Approval",
    });

    // 2. Get the 5 most recent truck arrivals (GRNs)
    const recentDeliveries = await GoodsReceipt.find()
      .populate("supplier", "name")
      .sort({ arrivalTimestamp: -1 })
      .limit(5);

    // 3. Find Low Stock Items (Assuming items with quantity < 50 are 'low', adjust threshold as needed)
    const lowStockItems = await StockBalance.find({ quantity: { $lt: 50 } })
      .populate("item", "name sku")
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        pendingPOsCount,
        recentDeliveries,
        lowStockItems,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send Custom Alert via WebSockets (Point 3)
// @route   POST /api/procurement/alert
exports.sendCustomAlert = async (req, res) => {
  try {
    const { message, targetAudience } = req.body;

    // Grab the Socket.io instance from the Express app
    // Note: Ensure your server.js/app.js sets `app.set('io', io)` when initializing sockets
    const io = req.app.get("io");

    if (!io) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Socket instance not found on server.",
        });
    }

    const alertPayload = {
      message,
      sender: req.user.name,
      timestamp: new Date(),
      type: "PROCUREMENT_ALERT",
    };

    if (targetAudience === "everyone") {
      io.emit("custom_alert", alertPayload);
    } else {
      // Emit to a specific room (e.g., 'warehouse_staff' or 'sales_team')
      io.to(targetAudience).emit("custom_alert", alertPayload);
    }

    res
      .status(200)
      .json({ success: true, message: "Alert broadcasted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

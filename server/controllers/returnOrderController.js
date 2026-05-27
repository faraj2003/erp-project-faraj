// server/controllers/returnOrderController.js
const ReturnOrder = require("../models/ReturnOrder");

exports.createReturn = async (req, res) => {
  try {
    const { goodsReceiptId, supplierId, returnedItems, totalCreditExpected } =
      req.body;

    const rtvNumber = `RTV-${Date.now().toString().slice(-6)}`;

    const rtv = new ReturnOrder({
      rtvNumber,
      goodsReceipt: goodsReceiptId,
      supplier: supplierId,
      returnedItems,
      totalCreditExpected,
      status: "Pending Credit",
      processedBy: req.user._id,
    });

    const savedReturn = await rtv.save();
    res.status(201).json({ success: true, data: savedReturn });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const returns = await ReturnOrder.find()
      .populate("supplier", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

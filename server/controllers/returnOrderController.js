const ReturnOrder = require("../models/ReturnOrder");

exports.createReturn = async (req, res) => {
  try {
    const { goodsReceiptId, supplierId, returnedItems, totalCreditExpected } =
      req.body;

    const rtvNumber = `RTV-${Date.now()}`;

    const rtv = new ReturnOrder({
      rtvNumber,
      goodsReceipt: goodsReceiptId,
      supplier: supplierId,
      returnedItems,
      totalCreditExpected,
      initiatedBy: req.user._id,
    });

    const savedRTV = await rtv.save();
    res.status(201).json({ success: true, data: savedRTV });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getReturns = async (req, res) => {
  try {
    const returns = await ReturnOrder.find()
      .populate("supplier", "name")
      .populate("goodsReceipt", "grnNumber")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

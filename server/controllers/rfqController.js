const RFQ = require("../models/RFQ");
const PurchaseOrder = require("../models/PurchaseOrder");
const Item = require("../models/Item");
const Supplier = require("../models/Supplier");

exports.createRFQ = async (req, res) => {
  try {
    const { itemId, targetQuantity, deadline } = req.body;
    const rfqNumber = `RFQ-${Date.now().toString().slice(-6)}`;

    const rfq = new RFQ({
      rfqNumber,
      item: itemId,
      targetQuantity,
      deadline,
      createdBy: req.user._id,
    });

    const savedRFQ = await rfq.save();
    res.status(201).json({ success: true, data: savedRFQ });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllRFQs = async (req, res) => {
  try {
    const rfqs = await RFQ.find()
      .populate("item", "name sku")
      .populate("bids.supplier", "name")
      .populate("awardedPurchaseOrder", "poNumber")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rfqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SIMULATION: In a real app, suppliers log into a vendor portal to hit this.
// We are exposing it so the manager can manually input vendor quotes they receive via email.
exports.submitBid = async (req, res) => {
  try {
    const { rfqId, supplierId, quotedPrice, promisedDeliveryDate } = req.body;
    const rfq = await RFQ.findById(rfqId);

    if (!rfq || rfq.status !== "Open")
      throw new Error("RFQ is not open for bidding.");

    // Check if supplier already bid, update it if so, otherwise push new
    const existingBidIndex = rfq.bids.findIndex(
      (b) => b.supplier.toString() === supplierId,
    );
    if (existingBidIndex >= 0) {
      rfq.bids[existingBidIndex].quotedPrice = quotedPrice;
      rfq.bids[existingBidIndex].promisedDeliveryDate = promisedDeliveryDate;
    } else {
      rfq.bids.push({
        supplier: supplierId,
        quotedPrice,
        promisedDeliveryDate,
      });
    }

    await rfq.save();
    res.status(200).json({ success: true, data: rfq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.awardBid = async (req, res) => {
  try {
    const { rfqId, bidId } = req.body;
    const rfq = await RFQ.findById(rfqId).populate("item");

    if (!rfq || rfq.status !== "Open")
      throw new Error("RFQ is closed or already awarded.");

    const winningBid = rfq.bids.id(bidId);
    if (!winningBid) throw new Error("Bid not found.");

    winningBid.isWinner = true;
    rfq.status = "Awarded";

    // MAGICAL PART: Auto-generate the Purchase Order from the winning bid
    const poNumber = `PO-RFQ-${Date.now().toString().slice(-5)}`;
    const newPO = new PurchaseOrder({
      poNumber,
      supplier: winningBid.supplier,
      items: [
        {
          item: rfq.item._id,
          quantity: rfq.targetQuantity,
          unitPrice: winningBid.quotedPrice,
          total: rfq.targetQuantity * winningBid.quotedPrice,
        },
      ],
      totalAmount: rfq.targetQuantity * winningBid.quotedPrice,
      expectedDeliveryDate: winningBid.promisedDeliveryDate,
      status: "Approved", // Auto-approved since the manager just awarded it!
      notes: `Generated from winning bid on ${rfq.rfqNumber}`,
      createdBy: req.user._id,
      approvedBy: req.user._id,
    });

    const savedPO = await newPO.save();
    rfq.awardedPurchaseOrder = savedPO._id;
    await rfq.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Bid awarded and PO generated!",
        data: rfq,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

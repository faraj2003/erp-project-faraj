// server/controllers/invoiceController.js
const VendorInvoice = require("../models/VendorInvoice");
const GoodsReceipt = require("../models/GoodsReceipt");
const PurchaseOrder = require("../models/PurchaseOrder");

exports.submitInvoice = async (req, res) => {
  try {
    const { invoiceNumber, goodsReceiptId, billedItems } = req.body;

    const grn =
      await GoodsReceipt.findById(goodsReceiptId).populate("purchaseOrder");
    if (!grn) throw new Error("GRN not found for matching.");

    const po = await PurchaseOrder.findById(grn.purchaseOrder._id);

    let matchStatus = "Matched";
    let discrepancies = [];
    let totalBilledAmount = 0;

    // 1. Line-by-Line Three-Way Match
    for (const billed of billedItems) {
      billed.total = billed.quantity * billed.unitPrice;
      totalBilledAmount += billed.total;

      const poItem = po.items.find(
        (i) => i.item.toString() === billed.item.toString(),
      );
      const grnItem = grn.receivedItems.find(
        (i) => i.item.toString() === billed.item.toString(),
      );

      if (!poItem || !grnItem) {
        matchStatus = "Discrepancy";
        discrepancies.push(`Item not found in original PO or GRN.`);
        continue;
      }

      // Verification A: Did they bill us for more units than actually arrived?
      if (billed.quantity > grnItem.receivedQuantity) {
        matchStatus = "Discrepancy";
        discrecrepancies.push(
          `Overbilled Quantity. Received ${grnItem.receivedQuantity}, Billed ${billed.quantity}.`,
        );
      }

      // Verification B: Did they sneakily raise the price higher than agreed on the PO?
      if (billed.unitPrice > poItem.unitPrice) {
        matchStatus = "Discrepancy";
        discrepancies.push(
          `Price Mismatch. PO agreed $${poItem.unitPrice}, Billed $${billed.unitPrice}.`,
        );
      }
    }

    const invoice = new VendorInvoice({
      invoiceNumber,
      supplier: grn.supplier,
      purchaseOrder: po._id,
      goodsReceipt: grn._id,
      billedItems,
      totalBilledAmount,
      matchStatus,
      discrepancyNotes: discrepancies.join(" | "),
      processedBy: req.user._id,
    });

    const savedInvoice = await invoice.save();
    res.status(201).json({ success: true, data: savedInvoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await VendorInvoice.find()
      .populate("supplier", "name")
      .populate("purchaseOrder", "poNumber")
      .populate("goodsReceipt", "grnNumber")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

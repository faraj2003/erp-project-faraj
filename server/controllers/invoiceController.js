// server/controllers/invoiceController.js
const VendorInvoice = require("../models/VendorInvoice");
const GoodsReceipt = require("../models/GoodsReceipt");

exports.submitInvoice = async (req, res) => {
  try {
    const { invoiceNumber, goodsReceiptId, billedItems } = req.body;

    const grn =
      await GoodsReceipt.findById(goodsReceiptId).populate("purchaseOrder");
    if (!grn) {
      return res
        .status(404)
        .json({ success: false, message: "Goods Receipt not found." });
    }

    let isDiscrepancy = false;
    let totalBilledAmount = 0;

    // 1. Process items to include the required "total" field for your strict schema
    const processedBilledItems = billedItems.map((billedItem) => {
      const itemTotal = billedItem.quantity * billedItem.unitPrice;
      totalBilledAmount += itemTotal;

      const receivedItem = grn.receivedItems.find(
        (ri) => ri.item.toString() === billedItem.item.toString(),
      );

      // 3-Way Match Logic
      if (
        !receivedItem ||
        billedItem.quantity > receivedItem.receivedQuantity
      ) {
        isDiscrepancy = true;
      }

      return { ...billedItem, total: itemTotal }; // Add the required 'total'
    });

    // 2. Map data perfectly to your VendorInvoice schema
    const invoice = new VendorInvoice({
      invoiceNumber,
      goodsReceipt: goodsReceiptId,
      purchaseOrder: grn.purchaseOrder._id,
      supplier: grn.supplier,
      billedItems: processedBilledItems,
      totalBilledAmount,
      matchStatus: isDiscrepancy ? "Discrepancy" : "Matched",
      discrepancyNotes: isDiscrepancy
        ? "System detected a quantity mismatch between GRN and Vendor Bill."
        : "",
      processedBy: req.user._id,
    });

    const savedInvoice = await invoice.save();
    res.status(201).json({ success: true, data: savedInvoice });
  } catch (error) {
    console.error("Invoice Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await VendorInvoice.find()
      .populate("supplier", "name")
      .sort({ createdAt: -1 });

    // 3. Transform the output so the React UI doesn't break
    // We map your strict DB fields back to what the frontend expects
    const mappedInvoices = invoices.map((inv) => ({
      ...inv.toObject(),
      isMatched: inv.matchStatus === "Matched",
      totalBilled: inv.totalBilledAmount,
      paymentStatus: inv.matchStatus === "Matched" ? "Paid" : "Disputed",
    }));

    res.status(200).json({ success: true, data: mappedInvoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const mongoose = require("mongoose");

const vendorInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true }, // The physical bill number from the vendor
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodsReceipt",
      required: true,
    },

    billedItems: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true },
      },
    ],

    totalBilledAmount: { type: Number, required: true },

    // The core of 3-way matching
    matchStatus: {
      type: String,
      enum: ["Pending", "Matched", "Discrepancy"],
      default: "Pending",
    },

    discrepancyNotes: { type: String, default: "" },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("VendorInvoice", vendorInvoiceSchema);

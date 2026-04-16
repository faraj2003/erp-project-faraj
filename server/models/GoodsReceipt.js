const mongoose = require("mongoose");

const goodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    batchId: { type: String, required: true, unique: true },

    receivedItems: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        expectedQuantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true, min: 0 },
        rejectedQuantity: { type: Number, default: 0 },
        unitPrice: { type: Number }, // Raw price from PO
        landedCostPerUnit: { type: Number }, // New: Price + distributed shipping costs
        notes: { type: String },
      },
    ],

    // NEW: Landed Cost Tracking
    logisticsCosts: {
      freight: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      customs: { type: Number, default: 0 },
      totalExtraCost: { type: Number, default: 0 },
    },

    logistics: {
      vehicleRegistration: { type: String, required: true },
      driverName: { type: String },
      waybillNumber: { type: String },
      arrivalTimestamp: { type: Date, default: Date.now },
    },

    status: { type: String, enum: ["Draft", "Submitted"], default: "Draft" },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GoodsReceipt", goodsReceiptSchema);

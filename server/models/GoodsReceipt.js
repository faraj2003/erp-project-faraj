const mongoose = require("mongoose");

const goodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, unique: true }, // Goods Receipt Note Number
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

    // The unique identifier for this specific delivery used for fault tracking
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
        // If items arrive broken, they are rejected here and don't enter stock
        rejectedQuantity: { type: Number, default: 0 },
        notes: { type: String },
      },
    ],

    // Point 6: Truck and Logistics tracking
    logistics: {
      vehicleRegistration: { type: String, required: true },
      driverName: { type: String },
      driverPhone: { type: String },
      waybillNumber: { type: String },
      arrivalTimestamp: { type: Date, default: Date.now },
    },

    // 'Draft' means the truck is unloading. 'Submitted' means it's officially in inventory.
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

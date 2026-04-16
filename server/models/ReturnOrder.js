const mongoose = require("mongoose");

const returnOrderSchema = new mongoose.Schema(
  {
    rtvNumber: { type: String, required: true, unique: true }, // Return To Vendor Number
    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodsReceipt",
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    returnedItems: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        reason: { type: String, required: true },
      },
    ],

    totalCreditExpected: { type: Number, required: true },

    // RTV Workflow Status
    status: {
      type: String,
      enum: ["Initiated", "Shipped", "Credit Received", "Closed"],
      default: "Initiated",
    },

    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ReturnOrder", returnOrderSchema);

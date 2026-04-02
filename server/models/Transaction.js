// server/models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      default: () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    type: {
      type: String,
      // NEW: Added "adjustment" to the valid transaction types
      enum: ["addition", "deduction", "transfer", "adjustment"],
      required: true,
    },
    sourceLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    quantityChanged: {
      type: Number,
      required: true,
    },
    newStockLevel: {
      type: Number,
      required: false,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);

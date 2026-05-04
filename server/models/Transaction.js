// server/models/Transaction.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const transactionSchema = new mongoose.Schema(
  {
    // PRD-INV-017: Unique alphanumeric transaction identifier
    transactionId: {
      type: String,
      unique: true,
      index: true,
    },
    // PRD-INV-037: Scope every transaction to its owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
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
      enum: [
        "addition",
        "deduction",
        "transfer",
        "adjustment",
        "shop_consumption",
        "scrap_return",
      ],
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
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// ── NEW FEATURE (PRD-INV-017): Automated Transaction ID Generation ──
// FIX: Removed 'next' callback for synchronous Mongoose 8 hooks
transactionSchema.pre("save", function () {
  if (!this.transactionId) {
    // Generate an ID based on the current date + 6 random hex characters
    // Example output: TXN-20260406-8F2A1C
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = crypto.randomBytes(3).toString("hex").toUpperCase();

    this.transactionId = `TXN-${datePrefix}-${randomStr}`;
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);

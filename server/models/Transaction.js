// server/models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
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

// ── NEW FEATURE (PRD-INV-039): Enforce Immutability ──

// 1. Prevent saving modifications to an existing document
transactionSchema.pre("save", function (next) {
  if (!this.isNew) {
    const err = new Error(
      "PRD-INV-039 Violation: Transactions are immutable and cannot be modified.",
    );
    return next(err);
  }
  next();
});

// 2. Prevent query-level updates (updateOne, updateMany, findOneAndUpdate)
transactionSchema.pre(/update/i, function (next) {
  const err = new Error(
    "PRD-INV-039 Violation: Transactions are immutable and cannot be updated.",
  );
  next(err);
});

// 3. Prevent query-level deletions (deleteOne, deleteMany, findOneAndDelete)
transactionSchema.pre(/delete/i, function (next) {
  const err = new Error(
    "PRD-INV-039 Violation: Transactions are immutable and cannot be deleted.",
  );
  next(err);
});

module.exports = mongoose.model("Transaction", transactionSchema);

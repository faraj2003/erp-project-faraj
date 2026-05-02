const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    actionType: {
      type: String,
      enum: ["Receipt", "Issue", "Transfer", "Adjustment"], // From your workflow diagram
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    sourceLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      // Required for Issues and Transfers, null for Receipts
    },
    destinationLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      // Required for Receipts and Transfers, null for Issues
    },
    quantityChanged: {
      type: Number,
      required: true,
    },
    batchNumber: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // To track who made the movement
      required: true,
    },
    referenceDraft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Adjustment", // Links to the Maker-Checker adjustment draft if applicable
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updates allowed
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);

const mongoose = require("mongoose");

const adjustmentSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
      // Can be positive (found extra stock) or negative (lost/damaged stock)
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Pending_Review", "Approved", "Rejected"],
      default: "Draft",
    },
    maker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // The staff member who reported the discrepancy
    },
    checker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The manager who approves/rejects it
    },
    managerNotes: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Adjustment", adjustmentSchema);

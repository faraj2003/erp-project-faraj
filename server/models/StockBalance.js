const mongoose = require("mongoose");

const stockBalanceSchema = new mongoose.Schema(
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
    // Batch tracking for FIFO/Expiry
    batchNumber: {
      type: String,
      default: "N/A",
    },
    expiryDate: Date,
    quantity: {
      type: Number,
      required: true,
      min: [0, "Stock cannot drop below zero. Immediate rejection triggered."], // Crucial safety constraint
    },
  },
  { timestamps: true },
);

// Ensure an item in a specific location with a specific batch is uniquely indexed
stockBalanceSchema.index(
  { item: 1, location: 1, batchNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model("StockBalance", stockBalanceSchema);

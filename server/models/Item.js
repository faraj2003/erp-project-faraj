const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    baseUnit: {
      type: String,
      required: true,
      default: "pcs", // Handles the "conversion to base units" requirement
    },
    // Multi-Tiered Stock Alerts (from your notes)
    alerts: {
      yellowThreshold: { type: Number, default: 100 },
      orangeThreshold: { type: Number, default: 50 },
      redThreshold: { type: Number, default: 10 },
    },
    // Batch & Lot Traceability toggle
    isBatchTracked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Item", itemSchema);

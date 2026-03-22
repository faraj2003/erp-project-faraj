// models/Item.js
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["raw_material", "finished_good"],
      required: true,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      lowercase: true,
    },
    // ── NEW: Financial Baselines ──
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    valuePerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // ──────────────────────────────
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Item", itemSchema);

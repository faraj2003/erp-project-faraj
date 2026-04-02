// server/models/Item.js
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
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
    },
    // Primary measuring unit (e.g., 'box', 'kg')
    unit: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Custom Secondary unit (e.g., 'pieces', 'grams')
    secondaryUnit: {
      type: String,
      lowercase: true,
    },
    // Conversion factor (e.g., if 1 box = 12 pieces, conversionFactor is 12)
    conversionFactor: {
      type: Number,
      min: 0,
    },
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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Item", itemSchema);

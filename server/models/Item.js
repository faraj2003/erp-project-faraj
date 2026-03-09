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
    }, // [cite: 166]
    name: {
      type: String,
      required: true,
    }, // [cite: 166]
    type: {
      type: String,
      enum: ["raw_material", "finished_good"],
      required: true,
    }, // [cite: 167]
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    }, // [cite: 168]
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
    }, // [cite: 169]
    unit: {
      type: String,
      required: true,
      lowercase: true,
    }, // [cite: 170]
  },
  {
    timestamps: true, // [cite: 171]
  },
);

module.exports = mongoose.model("Item", itemSchema);

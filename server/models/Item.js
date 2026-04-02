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
    // NEW: Category Hierarchies (e.g., ["Raw Materials", "Metals", "Aluminum"])
    categoryHierarchy: [
      {
        type: String,
        trim: true,
      },
    ],
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
    unit: {
      type: String,
      required: true,
      lowercase: true,
    },
    secondaryUnit: {
      type: String,
      lowercase: true,
    },
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
    // NEW: Multimedia Asset Integration
    imageUrl: {
      type: String,
      default: null,
    },
    // NEW: Archiving
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Item", itemSchema);

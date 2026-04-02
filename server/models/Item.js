// server/models/Item.js
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every item to its owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
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
    imageUrl: {
      type: String,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// PRD-INV-005: SKU must be unique PER company, not globally
itemSchema.index({ companyId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);

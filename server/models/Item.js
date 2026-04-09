// server/models/Item.js
const mongoose = require("mongoose");

const secondaryUnitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    multiplierToBase: {
      type: Number,
      required: true,
      min: 0.0001,
    },
  },
  { _id: false }, // No need to create _id for subdocuments
);

const itemSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every item to its owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // NEW FIX: Links the Item to the Category Hierarchy
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    // 1 - Company name of the product (Manufacturer/Brand)
    productCompanyName: {
      type: String,
      trim: true,
      default: "",
    },
    // 2 & 3 - Name and Type
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["raw_material", "finished_good"],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    // PRD-INV-013: Primary Measurement logic
    baseUnit: {
      type: String,
      required: true,
      lowercase: true,
    },
    // 9 - Secondary units mapping
    secondaryUnits: [secondaryUnitSchema],

    // 7 - Multi-level stock alerts (Replaces single minStockLevel)
    alertLevels: {
      orange: { type: Number, required: true, default: 0, min: 0 }, // Warning
      red: { type: Number, required: true, default: 0, min: 0 }, // Action required
      critical: { type: Number, required: true, default: 0, min: 0 }, // Severe shortage
    },

    // Valuation fields required by PRD-INV-040 exports
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

    // 5 - Shelf Life
    shelfLife: {
      type: String,
      trim: true,
      default: "",
    },
    // 6 - Dimensions of the product
    dimensions: {
      type: String,
      trim: true,
      default: "",
    },

    // 10 - Supplier Information
    supplier: {
      name: { type: String, trim: true, default: "" },
      contactInfo: { type: String, trim: true, default: "" },
    },

    imageUrl: {
      type: String,
      default: "",
    },
    // PRD-INV-008: Soft-delete implementation
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Ensure SKU is unique per company instance to prevent cross-contamination
itemSchema.index({ companyId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);

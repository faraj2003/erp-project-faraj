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
  { _id: false },
);

// NEW: Multi-supplier schema with price history
const supplierPricingSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    baseRate: {
      type: Number,
      required: true,
      min: 0,
    },
    history: [
      {
        rate: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
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
    // Links the Item to the Category Hierarchy
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
    productCompanyName: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // UPDATED: Removed the rigid enum to allow dynamic types from the frontend/system
    type: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    baseUnit: {
      type: String,
      required: true,
      lowercase: true,
    },
    secondaryUnits: [secondaryUnitSchema],

    alertLevels: {
      orange: { type: Number, required: true, default: 0, min: 0 },
      red: { type: Number, required: true, default: 0, min: 0 },
      critical: { type: Number, required: true, default: 0, min: 0 },
    },

    // FIX: Added minStockLevel — used by getLowStockItems and tests
    minStockLevel: {
      type: Number,
      default: 0,
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

    shelfLife: {
      type: String,
      trim: true,
      default: "",
    },

    // UPDATED: Split dimensions into length, breadth, and height (in meters)
    dimensions: {
      length: { type: Number, default: 0, min: 0 },
      breadth: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 },
    },

    // --- SPRINT 2: SMART PROCUREMENT LINKS ---
    defaultSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    // NEW: Array to support multiple suppliers and base rate history
    suppliers: [supplierPricingSchema],

    reorderQuantity: {
      type: Number,
      default: 100,
      min: 1,
    },

    imageUrl: {
      type: String,
      default: "",
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Ensure SKU is unique per company instance
itemSchema.index({ companyId: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Item", itemSchema);

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
    type: {
      type: String,
      enum: ["raw_material", "finished_good"],
      required: true,
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
    dimensions: {
      type: String,
      trim: true,
      default: "",
    },

    // --- SPRINT 2: SMART PROCUREMENT LINKS ---
    defaultSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    reorderQuantity: {
      type: Number,
      default: 100, // Default batch size the system will auto-order
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

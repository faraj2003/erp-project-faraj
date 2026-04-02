// server/models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope to owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Allows infinite nesting for multi-level hierarchies (PRD-INV-009)
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Ensure unique category names per company at the same hierarchical level
categorySchema.index(
  { companyId: 1, name: 1, parentCategoryId: 1 },
  { unique: true },
);

module.exports = mongoose.model("Category", categorySchema);

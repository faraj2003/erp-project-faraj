// server/models/Adjustment.js
const mongoose = require("mongoose");

const adjustmentSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every adjustment to its owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    // ── NEW FIELDS FOR RULES ENGINE ──
    totalValueImpact: {
      type: Number,
      default: 0,
    },
    requiredApprovalLevel: {
      type: String,
      enum: ["auto", "manager", "admin"],
      default: "manager",
    },
    status: {
      // Added 'auto_approved' to the allowed statuses
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "auto_approved"],
      default: "draft",
    },
    // ────────────────────────────────
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Adjustment", adjustmentSchema);

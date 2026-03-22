// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
      index: true,
    },

    // ── NEW: Audit Trail ──
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed", "Cancelled"],
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // ──────────────────────

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // ── NEW: Financials ──
    financials: {
      totalMaterialCost: { type: Number, default: 0 },
      totalProductionValue: { type: Number, default: 0 },
    },
    // ─────────────────────

    // Raw materials used
    inputs: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantityRequired: {
          type: Number,
          required: true,
          min: 0.01,
        },
        // Snapshot the cost so historical orders don't change if item prices update later
        unitCost: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Finished goods produced
    outputs: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantityProduced: {
          type: Number,
          required: true,
          min: 0.01,
        },
        // Snapshot the value so historical orders don't change if item prices update later
        unitValue: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Pre-save middleware to automatically log the initial status creation
orderSchema.pre("save", function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this.managerId,
      timestamp: new Date(),
    });
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);

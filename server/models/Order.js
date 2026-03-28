// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── NEW: Which Shop is executing this order? ──
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, trim: true, default: "" },
    financials: {
      totalMaterialCost: { type: Number, default: 0 },
      totalProductionValue: { type: Number, default: 0 },
    },

    inputs: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantityRequired: { type: Number, required: true, min: 0.01 }, // The estimate

        // ── NEW: Actuals & Scrap Tracking ──
        quantityUtilized: { type: Number, default: 0 }, // What went into the final product
        quantityScrapped: { type: Number, default: 0 }, // What was wasted/damaged

        unitCost: { type: Number, default: 0 },
      },
    ],
    outputs: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantityProduced: { type: Number, required: true, min: 0.01 },
        unitValue: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

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

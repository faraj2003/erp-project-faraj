// server/models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every order to its owning company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, index: true },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
        quantityRequired: { type: Number, required: true, min: 0.01 },
        quantityUtilized: { type: Number, default: 0 },
        quantityScrapped: { type: Number, default: 0 },
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

// Order numbers must be unique per company, not globally
orderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });

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

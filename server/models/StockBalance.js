// server/models/StockBalance.js
const mongoose = require("mongoose");

const stockBalanceSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every balance record to its owning company
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
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    zoneName: { type: String, default: "Default" },
    rackName: { type: String, default: "Default" },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// Unique balance per company + item + location + zone + rack
stockBalanceSchema.index(
  { companyId: 1, itemId: 1, locationId: 1, zoneName: 1, rackName: 1 },
  { unique: true },
);

module.exports = mongoose.model("StockBalance", stockBalanceSchema);

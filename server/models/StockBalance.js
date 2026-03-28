// models/StockBalance.js
const mongoose = require("mongoose");

const stockBalanceSchema = new mongoose.Schema(
  {
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
    zoneName: { type: String, default: "Default" }, // For Requirement 4
    rackName: { type: String, default: "Default" }, // For Requirement 4
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// Ensure an item only has one balance per exact location/zone/rack combo
stockBalanceSchema.index(
  { itemId: 1, locationId: 1, zoneName: 1, rackName: 1 },
  { unique: true },
);

module.exports = mongoose.model("StockBalance", stockBalanceSchema);

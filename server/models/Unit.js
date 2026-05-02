const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // e.g., "Pallet", "Box of 12", "Drum"
    },
    abbreviation: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      // e.g., "PLT", "BX12", "DRM"
    },
    baseUnit: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // The standard unit it converts to, e.g., "pcs", "kg", "ml"
    },
    conversionRate: {
      type: Number,
      required: true,
      min: [0.00001, "Conversion rate must be greater than zero."],
      // e.g., If 1 Pallet = 500 pcs, conversionRate is 500
    },
    description: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Unit", unitSchema);

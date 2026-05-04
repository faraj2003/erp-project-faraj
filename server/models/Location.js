// server/models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    // PRD-INV-037: Scope every location to its owning company
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
    type: {
      type: String,
      enum: ["Warehouse", "Shop", "Scrap"],
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    zones: [
      {
        name: { type: String, required: true },
        racks: [
          {
            name: { type: String, required: true },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Location names must be unique per company, not globally
locationSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Location", locationSchema);

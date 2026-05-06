// server/models/BOM.js
const mongoose = require("mongoose");

const bomSchema = new mongoose.Schema(
  {
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
    finishedGoodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    produceQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    rawMaterials: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantityRequired: {
          type: Number,
          required: true,
          min: 0.0001,
        },
        unit: {
          type: String,
          required: true,
        },
      },
    ],
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

bomSchema.index({ companyId: 1, finishedGoodId: 1 }, { unique: true });

module.exports = mongoose.model("BOM", bomSchema);

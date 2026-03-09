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

    // ── NEW FIELD: Order Notes ──
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    // ────────────────────────────

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
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Order", orderSchema);

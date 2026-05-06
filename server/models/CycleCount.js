// server/models/CycleCount.js
const mongoose = require("mongoose");

const cycleCountSchema = new mongoose.Schema(
  {
    // Scoped to the company just like your Item model
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
      default: function () {
        return `Audit-${Date.now().toString().slice(-6)}`;
      },
    },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    scheduledDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // The warehouse/zone they are auditing
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    // The list of items they need to count
    itemsToCount: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        // What the system thinks is there
        expectedQuantity: {
          type: Number,
          required: true,
        },
        // What the worker actually counts on the floor
        actualQuantity: {
          type: Number,
          default: null,
        },
        // actualQuantity - expectedQuantity
        variance: {
          type: Number,
          default: 0,
        },
        notes: {
          type: String,
          default: "",
        },
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Ensure fast lookups by company and location
cycleCountSchema.index({ companyId: 1, locationId: 1 });

module.exports = mongoose.model("CycleCount", cycleCountSchema);

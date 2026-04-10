const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],

    totalAmount: { type: Number, required: true },

    // Strict state management for the workflow
    status: {
      type: String,
      enum: [
        "Draft",
        "Pending Approval",
        "Approved",
        "Partially Received",
        "Fulfilled",
        "Cancelled",
      ],
      default: "Draft",
    },

    expectedDeliveryDate: { type: Date },
    notes: { type: String },

    // Audit Trails
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Populated when Manager approves
    approvedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);

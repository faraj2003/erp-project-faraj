const mongoose = require("mongoose");

const rfqSchema = new mongoose.Schema(
  {
    rfqNumber: { type: String, required: true, unique: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    targetQuantity: { type: Number, required: true, min: 1 },
    deadline: { type: Date, required: true },

    status: {
      type: String,
      enum: ["Open", "Closed", "Awarded"],
      default: "Open",
    },

    // The Bidding War Data
    bids: [
      {
        supplier: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Supplier",
          required: true,
        },
        quotedPrice: { type: Number, required: true },
        promisedDeliveryDate: { type: Date },
        isWinner: { type: Boolean, default: false },
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    // If a bid wins, it generates a PO and links it here
    awardedPurchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RFQ", rfqSchema);

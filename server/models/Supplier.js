const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true },
    address: { type: String },
    taxId: { type: String }, // GSTIN, VAT, etc.
    isActive: { type: Boolean, default: true },
    // Optional: Track supplier reliability over time
    rating: { type: Number, min: 1, max: 5, default: 3 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Supplier", supplierSchema);

const mongoose = require("mongoose");

const typeSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

// Prevent duplicate types in the same company
typeSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Type", typeSchema);

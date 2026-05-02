const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    zone: {
      type: String,
      required: true,
      enum: [
        "Receiving",
        "General Storage",
        "Quarantine",
        "Production",
        "Dispatch",
      ],
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Location", locationSchema);

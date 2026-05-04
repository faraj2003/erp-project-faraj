// server/models/Unit.js
const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
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
      lowercase: true,
      trim: true,
    },
    abbreviation: {
      type: String,
      required: true,
      trim: true,
    },
    // PRD-INV-013: Flag to indicate if this is a system-protected unit
    isCore: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Ensure unique unit names per company
unitSchema.index({ companyId: 1, name: 1 }, { unique: true });

// PRD-INV-013: Middleware to PREVENT DELETION of core units
unitSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && doc.isCore) {
    throw new Error(
      "PRD-INV-013 Violation: Cannot delete a core system measurement unit.",
    );
  }
});

// PRD-INV-013: Middleware to PREVENT MODIFICATION of core units
unitSchema.pre("findOneAndUpdate", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc && doc.isCore) {
    const update = this.getUpdate();
    // Prevent changing the fundamental identity of a core unit
    if (
      update.name ||
      update.abbreviation ||
      update.$set?.name ||
      update.$set?.abbreviation
    ) {
      throw new Error(
        "PRD-INV-013 Violation: Cannot modify the name or abbreviation of a core system measurement unit.",
      );
    }
  }
});

module.exports = mongoose.model("Unit", unitSchema);

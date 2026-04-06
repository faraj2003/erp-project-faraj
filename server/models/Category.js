// server/models/Category.js
const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    // PRD-INV-037: Tenant isolation
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
    description: {
      type: String,
      default: "",
    },
    // PRD-INV-009 to 012: Multi-level category hierarchy
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null, // If null, it is a top-level (root) category
      index: true,
    },
    // Materialized path for extremely fast querying of deep category trees
    // Format will be ",rootId,childId,"
    path: {
      type: String,
      default: "",
      index: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate category names within the SAME parent level of the SAME company
categorySchema.index({ companyId: 1, parentId: 1, name: 1 }, { unique: true });

// Pre-save hook to automatically build the hierarchical path
categorySchema.pre("save", async function (next) {
  if (this.isModified("parentId")) {
    if (this.parentId) {
      const parent = await this.model("Category").findById(this.parentId);
      if (parent) {
        this.path = `${parent.path}${parent._id},`;
      }
    } else {
      this.path = `,`; // Root path
    }
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);

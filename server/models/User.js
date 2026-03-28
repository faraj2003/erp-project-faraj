// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        "staff",
        "manager",
        "admin",
        "shop_manager",
        "shop_worker",
        "procurement_manager",
        "dispatch_manager",
      ],
      default: "staff",
    },
    // ── Bind a user to a specific shop or warehouse ──
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// --- THE SECURITY HOOK ---
// Before saving a user, encrypt their password
userSchema.pre("save", async function (next) {
  // If the password wasn't modified, skip this step
  if (!this.isModified("password")) return next();

  // Generate the "salt" (random characters) and hash the password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// A helper method to check passwords when the user logs in later
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

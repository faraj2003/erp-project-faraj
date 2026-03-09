// controllers/userController.js
const User = require("../models/User");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// @desc    Get all users (directory)
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res, next) => {
  try {
    // Optional role filter: GET /api/users?role=staff
    const filter = {};
    if (req.query.role) {
      const validRoles = ["staff", "manager", "admin"];
      if (!validRoles.includes(req.query.role)) {
        return next(
          new AppError(
            `Invalid role filter. Must be one of: ${validRoles.join(", ")}`,
            400,
          ),
        );
      }
      filter.role = req.query.role;
    }

    // Never return password hashes
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error); // CastError (invalid ObjectId) handled by errorHandler
  }
};

// @desc    Update a user's role
// @route   PATCH /api/users/:id/role
// @access  Private (Admin only)
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    // Prevent admins from accidentally demoting themselves
    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot change your own role", 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    logger.info(
      `[Users] Role updated: ${user.email} → ${role} by admin ${req.user._id}`,
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Create a new user account ──
// @desc    Create a new user account
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email is already in use
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("A user with this email already exists", 400));
    }

    // Create the user (password will be hashed automatically by the pre-save hook in User.js)
    const user = await User.create({
      name,
      email,
      password,
      role: role || "staff",
    });

    logger.info(
      `[Users] New user created: ${user.email} by admin ${req.user._id}`,
    );

    // Fetch the user again to exclude the password from the response
    const createdUser = await User.findById(user._id).select("-password");

    res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    next(error);
  }
};

// Make sure to export the new function!
module.exports = { getUsers, getUserById, updateUserRole, createUser };

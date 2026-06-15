// server/controllers/userController.js
const User = require("../models/User");
const AppError = require("../utils/AppError");

// @desc    Get all users for this company
// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
  try {
    const filter = { companyId: req.companyId };
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .populate("locationId", "name type")
      .select("-password");

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    })
      .populate("locationId", "name type")
      .select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user under the same company
// @route   POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, locationId } = req.body;

    // NEW (Point 7): Privilege Escalation Prevention
    // Only a super_admin can create an admin or another super_admin
    if (role === "admin" || role === "super_admin") {
      if (req.user.role !== "super_admin") {
        return next(
          new AppError(
            "Security Violation: Only a Super Admin can create other admin accounts.",
            403,
          ),
        );
      }
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists with this email", 400));
    }

    const user = await User.create({
      companyId: req.companyId,
      name,
      email,
      password,
      role: role || "staff",
      locationId: locationId || null,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/users/:id/role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (req.params.id === req.user._id.toString()) {
      return next(new AppError("You cannot change your own role", 400));
    }

    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // NEW (Point 7): Privilege Escalation Prevention
    // 1. A regular admin cannot modify an existing admin's account
    if (user.role === "admin" || user.role === "super_admin") {
      if (req.user.role !== "super_admin") {
        return next(
          new AppError(
            "Security Violation: You do not have permission to modify existing admin accounts.",
            403,
          ),
        );
      }
    }

    // 2. A regular admin cannot promote a lower-tier user UP to admin
    if (role === "admin" || role === "super_admin") {
      if (req.user.role !== "super_admin") {
        return next(
          new AppError(
            "Security Violation: Only a Super Admin can promote a user to an admin role.",
            403,
          ),
        );
      }
    }

    user.role = role;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Prevent regular admins from deleting admins
    if (user.role === "admin" || user.role === "super_admin") {
      if (req.user.role !== "super_admin") {
        return next(
          new AppError(
            "Security Violation: You cannot delete an admin account.",
            403,
          ),
        );
      }
    }

    await user.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "User removed successfully" });
  } catch (error) {
    next(error);
  }
};

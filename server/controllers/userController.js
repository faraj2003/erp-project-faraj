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

    await user.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "User removed successfully" });
  } catch (error) {
    next(error);
  }
};

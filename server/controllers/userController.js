// controllers/userController.js
const User = require("../models/User");

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate("locationId", "name type")
      .select("-password");

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("locationId", "name type")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, locationId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "staff",
      locationId: locationId || null,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.status(200).json({
      message: "User removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

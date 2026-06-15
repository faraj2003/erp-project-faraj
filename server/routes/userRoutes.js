// server/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUserById,
  updateUserRole,
  createUser,
  deleteUser, // Added to match controller exports
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateRequest");

const {
  updateRoleSchema,
  createUserSchema,
} = require("../schemas/user.schema");

// Point 7: Allow both admins and super_admins to access the directory
router.use(protect, authorize("admin", "super_admin"));

// GET /api/users — Get full user directory (supports ?role=staff filter)
router.get("/", getUsers);

// POST /api/users — Admin/Super Admin creates a new user
router.post("/", validate(createUserSchema), createUser);

// GET /api/users/:id — Get a single user's details
router.get("/:id", getUserById);

// PATCH /api/users/:id/role — Promote/demote a user's role
router.patch("/:id/role", validate(updateRoleSchema), updateUserRole);

// DELETE /api/users/:id
router.delete("/:id", deleteUser);

module.exports = router;

// routes/userRoutes.js
const express = require("express");
const router = express.Router();
// ── NEW: Import createUser ──
const {
  getUsers,
  getUserById,
  updateUserRole,
  createUser,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateRequest");
// ── NEW: Import createUserSchema ──
const {
  updateRoleSchema,
  createUserSchema,
} = require("../schemas/user.schema");

// All user routes are Admin only
router.use(protect, authorize("admin"));

// GET /api/users — Get full user directory (supports ?role=staff filter)
router.get("/", getUsers);

// ── NEW: POST /api/users — Admin creates a new user ──
router.post("/", validate(createUserSchema), createUser);

// GET /api/users/:id — Get a single user's details
router.get("/:id", getUserById);

// PATCH /api/users/:id/role — Promote/demote a user's role
router.patch("/:id/role", validate(updateRoleSchema), updateUserRole);

module.exports = router;

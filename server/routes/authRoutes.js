// routes/authRoutes.js
const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const validate = require("../middleware/validateRequest");
const { protect, authorize } = require("../middleware/authMiddleware");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");

// loginLimiter is passed in from server.js so it can be configured centrally
module.exports = (loginLimiter) => {
  const router = express.Router();

  // POST /api/auth/register — Admin only (no public self-registration)
  router.post(
    "/register",
    protect,
    authorize("admin"),
    validate(registerSchema),
    registerUser
  );

  // POST /api/auth/login — Public, but rate-limited to 5 attempts per 15 min
  router.post("/login", loginLimiter, validate(loginSchema), loginUser);

  return router;
};

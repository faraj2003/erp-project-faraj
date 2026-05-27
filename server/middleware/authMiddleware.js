// server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

// 1. Verify the JWT, attach the user, and inject companyId onto req
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return next(
          new AppError("User belonging to this token no longer exists", 401),
        );
      }

      // PRD-INV-037: Make companyId available on every request so all
      // controllers can scope their queries without repeating themselves.
      if (!req.user.companyId) {
        return next(
          new AppError("User account is not associated with a company", 403),
        );
      }
      req.companyId = req.user.companyId;

      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(
          new AppError("Token has expired. Please log in again.", 401),
        );
      }
      if (error.name === "JsonWebTokenError") {
        return next(new AppError("Invalid token. Please log in again.", 401));
      }
      return next(error);
    }
  }

  if (!token) {
    return next(new AppError("Not authorized. No token provided.", 401));
  }
};

// 2. Check the user's role against the allowed roles list
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not authorized to access this route`,
          403,
        ),
      );
    }
    next();
  };
};

module.exports = { protect, authorize };

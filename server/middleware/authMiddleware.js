// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

// 1. Verify the JWT and attach the user to req
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // jwt.verify throws JsonWebTokenError / TokenExpiredError — caught by errorHandler
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return next(new AppError("User belonging to this token no longer exists", 401));
      }

      return next();
    } catch (error) {
      return next(error); // Passed to errorHandler which handles JWT errors specifically
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
          403
        )
      );
    }
    next();
  };
};

module.exports = { protect, authorize };

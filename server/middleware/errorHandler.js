// middleware/errorHandler.js
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value '${value}' for field '${field}'. Please use a different value.`; // contains "duplicate" ✓
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  const appErr = new AppError("Validation Error", 400);
  appErr.details = errors; // ← ADDED: attach details so res.body.details works
  return appErr;
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError("Your session has expired. Please log in again.", 401);

const handleZodError = (err) => {
  const details = err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  const appErr = new AppError("Validation Error", 400);
  appErr.details = details;
  return appErr;
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  logger.error(
    `${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`,
  );
  if (err.stack && process.env.NODE_ENV !== "production") {
    logger.debug(err.stack);
  }

  let error = err;

  if (err.name === "CastError") error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === "ValidationError") error = handleValidationError(err);
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  if (err.name === "ZodError") error = handleZodError(err);

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }

  logger.error("UNEXPECTED ERROR:", err);
  return res.status(500).json({
    success: false,
    error: "Something went wrong. Please try again later.",
  });
};

module.exports = errorHandler;

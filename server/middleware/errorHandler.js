// middleware/errorHandler.js
// The single, central place all errors flow to via next(error).
// Express recognises a 4-argument middleware as the error handler.
// Must be registered AFTER all routes in server.js.

const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// --- Specific error translators ---

// Mongoose: invalid ObjectId (e.g. /api/orders/not-a-real-id)
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// MongoDB: duplicate unique field (e.g. duplicate SKU or email)
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value '${value}' for field '${field}'. Please use a different value.`;
  return new AppError(message, 400);
};

// Mongoose: schema validation failure (e.g. missing required field)
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new AppError("Validation Error", 400, errors);
};

// JWT: token is malformed or has been tampered with
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

// JWT: token has expired
const handleJWTExpiredError = () =>
  new AppError("Your session has expired. Please log in again.", 401);

// Zod: request body failed schema validation
const handleZodError = (err) => {
  const details = err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  // Attach details to a new AppError for the response
  const appErr = new AppError("Validation Error", 400);
  appErr.details = details;
  return appErr;
};

// --- Main Error Handler ---
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no statusCode was set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log every error (stack trace in dev, just message in prod)
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack && process.env.NODE_ENV !== "production") {
    logger.debug(err.stack);
  }

  // --- Translate known Mongoose/JWT/Zod errors into clean AppErrors ---
  let error = err;

  if (err.name === "CastError") error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === "ValidationError") error = handleValidationError(err);
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  if (err.name === "ZodError") error = handleZodError(err);

  // --- Send response ---

  // Operational errors: safe to send details to the client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(error.details && { details: error.details }), // Include Zod/validation details if present
    });
  }

  // Programming or unknown errors: don't leak details — send generic message
  logger.error("UNEXPECTED ERROR:", err);
  return res.status(500).json({
    success: false,
    error: "Something went wrong. Please try again later.",
  });
};

module.exports = errorHandler;

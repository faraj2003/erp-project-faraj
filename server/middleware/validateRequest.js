// middleware/validateRequest.js
// A middleware factory that takes a Zod schema and validates req.body against it
// before the request ever reaches the controller.
// Usage: router.post("/", validate(createOrderSchema), createOrder)

const { z } = require("zod");
const AppError = require("../utils/AppError");

const validate = (schema) => (req, res, next) => {
  try {
    // .parse() throws a ZodError if validation fails
    // We reassign req.body to the parsed (and coerced/sanitised) output
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      // FIX: Use err.issues instead of err.errors to prevent crashing
      const details = (err.issues || []).map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      // Build a clean AppError and attach details
      const appErr = new AppError("Validation Error", 400);
      appErr.details = details;
      return next(appErr);
    }
    // Unexpected error — pass it along
    return next(err);
  }
};

module.exports = validate;

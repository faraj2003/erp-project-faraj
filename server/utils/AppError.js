// utils/AppError.js
// A custom error class that extends the built-in JS Error.
// By attaching a statusCode and isOperational flag, our global error handler
// can distinguish between expected app errors (e.g. "Item not found") and
// unexpected crashes (e.g. a bug in the code).

class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // Call the parent Error constructor with the message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    // isOperational = true means this is a known, expected error we threw on purpose.
    // The global error handler uses this to decide whether to send details to the client.
    this.isOperational = true;

    // Captures the stack trace, excluding the constructor call itself from the trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

// utils/logger.js
// Replaces all console.log() calls with structured, levelled logging via Winston.
// In development: pretty coloured output in the terminal.
// In production: clean JSON logs (easy to ingest into tools like Datadog / CloudWatch).

const { createLogger, format, transports } = require("winston");

const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for development: "2026-03-06 12:00:00 [ERROR]: Something went wrong"
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }), // Print full stack trace on errors
  printf(({ level, message, timestamp, stack }) => {
    return stack
      ? `${timestamp} [${level}]: ${message}\n${stack}`
      : `${timestamp} [${level}]: ${message}`;
  })
);

// Clean JSON format for production log ingestion
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

module.exports = logger;

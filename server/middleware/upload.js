// server/middleware/upload.js
// PRD-INV-005/006: File System Abstraction for multimedia asset management.
// Uses multer with disk storage. To swap to S3 or any cloud provider,
// replace the `storage` engine here — no controller code changes needed.

const multer = require("multer");
const path = require("path");
const AppError = require("../utils/AppError");

// Store uploads in /uploads relative to the server root.
// In production, point this at a mounted volume or swap for multer-s3.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    // Prefix with timestamp + random string to prevent collisions
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `item-${uniqueSuffix}${ext}`);
  },
});

// Only allow image file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.",
        400,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

module.exports = upload;

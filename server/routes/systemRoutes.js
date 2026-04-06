// server/routes/systemRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getCategories,
  createCategory,
  deleteCategory,
  getUnits,
  createUnit,
  deleteUnit,
} = require("../controllers/systemController");

router.use(protect);

// Category Routes
router
  .route("/categories")
  .get(getCategories)
  .post(authorize("admin", "manager"), createCategory);
router.delete("/categories/:id", authorize("admin"), deleteCategory);

// Unit Routes
router
  .route("/units")
  .get(getUnits)
  .post(authorize("admin", "manager"), createUnit);
router.delete("/units/:id", authorize("admin"), deleteUnit);

module.exports = router;

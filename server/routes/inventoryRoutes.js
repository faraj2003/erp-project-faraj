// routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getItems,
  createItem,
  addStock,
  transferStock,
} = require("../controllers/inventoryController");

router.use(protect);

router
  .route("/")
  .get(getItems)
  .post(authorize("admin", "manager", "procurement_manager"), createItem);

router.post(
  "/:id/stock",
  authorize("admin", "manager", "procurement_manager"),
  addStock,
);

// NEW: Route to transfer stock
router.post(
  "/:id/transfer",
  authorize("admin", "manager", "dispatch_manager"),
  transferStock,
);

module.exports = router;

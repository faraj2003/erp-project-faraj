// routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
// ── CHANGED: Import updateItem and deleteItem ──
const {
  createItem,
  getItems,
  getLowStockItems,
  updateItem,
  deleteItem,
} = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateRequest");
const { createItemSchema } = require("../schemas/inventory.schema");

router.get("/low-stock", protect, getLowStockItems);
router.get("/", protect, getItems);

// Only managers and admins can add new items
router.post(
  "/",
  protect,
  authorize("manager", "admin"),
  validate(createItemSchema),
  createItem,
);

// ── NEW: Only managers and admins can edit or delete items ──
router.put("/:id", protect, authorize("manager", "admin"), updateItem);
router.delete("/:id", protect, authorize("manager", "admin"), deleteItem);

module.exports = router;

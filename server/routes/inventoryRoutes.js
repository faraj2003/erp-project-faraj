// routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const { createItem, getItems, getLowStockItems } = require("../controllers/inventoryController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateRequest");
const { createItemSchema } = require("../schemas/inventory.schema");

// GET /api/inventory/low-stock — Must be defined BEFORE /:id to avoid route conflict
// Returns all items where currentStock < minStockLevel
router.get("/low-stock", protect, getLowStockItems);

// GET /api/inventory — Anyone logged in can view the inventory
router.get("/", protect, getItems);

// POST /api/inventory — Only managers and admins can add new items
router.post("/", protect, authorize("manager", "admin"), validate(createItemSchema), createItem);

module.exports = router;

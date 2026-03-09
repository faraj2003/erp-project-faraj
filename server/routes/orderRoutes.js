// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getOrders, createOrder, completeOrder } = require("../controllers/orderController");
const validate = require("../middleware/validateRequest");
const { createOrderSchema, updateOrderStatusSchema } = require("../schemas/order.schema");

// GET /api/orders — All authenticated users can view orders (paginated)
// Supports: ?page=1&limit=10&status=Pending
router.get("/", protect, getOrders);

// POST /api/orders — Only managers and admins can create orders
router.post("/", protect, authorize("manager", "admin"), validate(createOrderSchema), createOrder);

// PATCH /api/orders/:id/status — Only managers and admins can update order status
router.patch(
  "/:id/status",
  protect,
  authorize("manager", "admin"),
  validate(updateOrderStatusSchema),
  completeOrder,
);

module.exports = router;

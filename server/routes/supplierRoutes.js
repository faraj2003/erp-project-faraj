const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// Anyone can view suppliers (useful for staff checking lead times)
router.get("/", supplierController.getAllSuppliers);

// Only managers and admins can add or edit vendor details
router.post(
  "/",
  authorize("manager", "admin"),
  supplierController.createSupplier,
);
router.patch(
  "/:id",
  authorize("manager", "admin"),
  supplierController.updateSupplier,
);

module.exports = router;

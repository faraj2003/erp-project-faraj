const express = require("express");
const router = express.Router();
const unitController = require("../controllers/unitController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// Anyone logged in can view the units to use them in dropdowns
router.get("/", unitController.getAllUnits);

// Only managers and admins can create or delete conversion rules
router.post("/", authorize("manager", "admin"), unitController.createUnit);
router.delete("/:id", authorize("manager", "admin"), unitController.deleteUnit);

module.exports = router;

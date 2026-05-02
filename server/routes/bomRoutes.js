const express = require("express");
const router = express.Router();
const bomController = require("../controllers/bomController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", bomController.getAllBOMs);
router.post("/", authorize("manager", "admin"), bomController.createBOM);
router.post(
  "/assemble",
  authorize("staff", "manager", "admin"),
  bomController.assembleKit,
);

module.exports = router;

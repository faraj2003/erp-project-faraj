const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getLocations,
  createLocation,
  addZone,
  addRack,
} = require("../controllers/locationController");

// Protect all location routes
router.use(protect);

router
  .route("/")
  .get(getLocations)
  .post(authorize("admin", "manager"), createLocation);

router.post("/:id/zones", authorize("admin", "manager"), addZone);
router.post("/:id/zones/:zoneId/racks", authorize("admin", "manager"), addRack);

module.exports = router;

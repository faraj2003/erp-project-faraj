// server/controllers/locationController.js
const Location = require("../models/Location");

// @desc    Get all locations for this company
// @route   GET /api/locations
exports.getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find({
      companyId: req.companyId,
    }).populate("managerId", "name email");
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new location
// @route   POST /api/locations
exports.createLocation = async (req, res, next) => {
  try {
    const { name, type, managerId } = req.body;
    const location = await Location.create({
      companyId: req.companyId,
      name,
      type,
      managerId,
    });
    res.status(201).json(location);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a Zone to a Location
// @route   POST /api/locations/:id/zones
exports.addZone = async (req, res, next) => {
  try {
    const location = await Location.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });
    if (!location)
      return res.status(404).json({ message: "Location not found" });

    location.zones.push({ name: req.body.name, racks: [] });
    await location.save();
    res.status(200).json(location);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a Rack to a Zone
// @route   POST /api/locations/:id/zones/:zoneId/racks
exports.addRack = async (req, res, next) => {
  try {
    const location = await Location.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });
    if (!location)
      return res.status(404).json({ message: "Location not found" });

    const zone = location.zones.id(req.params.zoneId);
    if (!zone) return res.status(404).json({ message: "Zone not found" });

    zone.racks.push({ name: req.body.name });
    await location.save();
    res.status(200).json(location);
  } catch (error) {
    next(error);
  }
};

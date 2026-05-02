const Unit = require("../models/Unit");
const AppError = require("../utils/AppError");

// Get all custom units
exports.getAllUnits = async (req, res, next) => {
  try {
    const units = await Unit.find().sort({ name: 1 });
    res.status(200).json({
      status: "success",
      data: units,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new custom unit
exports.createUnit = async (req, res, next) => {
  try {
    const { name, abbreviation, baseUnit, conversionRate, description } =
      req.body;

    const newUnit = await Unit.create({
      name,
      abbreviation,
      baseUnit,
      conversionRate,
      description,
    });

    res.status(201).json({
      status: "success",
      message: "Custom unit created successfully.",
      data: newUnit,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        new AppError(
          "A unit with this name or abbreviation already exists.",
          400,
        ),
      );
    }
    next(error);
  }
};

// Delete a custom unit
exports.deleteUnit = async (req, res, next) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);

    if (!unit) {
      return next(new AppError("No unit found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

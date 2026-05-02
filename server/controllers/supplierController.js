const Supplier = require("../models/Supplier");
const AppError = require("../utils/AppError");

exports.getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.status(200).json({ status: "success", data: suppliers });
  } catch (error) {
    next(error);
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const newSupplier = await Supplier.create(req.body);
    res
      .status(201)
      .json({
        status: "success",
        message: "Supplier added.",
        data: newSupplier,
      });
  } catch (error) {
    if (error.code === 11000)
      return next(
        new AppError("A supplier with this name already exists.", 400),
      );
    next(error);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier) throw new AppError("Supplier not found", 404);
    res
      .status(200)
      .json({
        status: "success",
        message: "Supplier updated.",
        data: supplier,
      });
  } catch (error) {
    next(error);
  }
};

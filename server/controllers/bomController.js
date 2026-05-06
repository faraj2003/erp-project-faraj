// server/controllers/bomController.js
const BOM = require("../models/BOM");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");

// @desc    Get all BOMs
// @route   GET /api/inventory/boms
exports.getBOMs = async (req, res, next) => {
  try {
    const boms = await BOM.find({ companyId: req.companyId })
      .populate("finishedGoodId", "name sku baseUnit")
      .populate("rawMaterials.itemId", "name sku baseUnit")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: boms.length, data: boms });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new BOM
// @route   POST /api/inventory/boms
exports.createBOM = async (req, res, next) => {
  try {
    const { name, finishedGoodId, produceQuantity, rawMaterials, notes } =
      req.body;
    const companyId = req.companyId;

    const bom = await BOM.create({
      companyId,
      name,
      finishedGoodId,
      produceQuantity,
      rawMaterials,
      notes,
    });

    res.status(201).json({ success: true, data: bom });
  } catch (error) {
    next(error);
  }
};

// @desc    Assemble/Produce a Finished Good from a BOM
// @route   POST /api/inventory/boms/:id/assemble
exports.assembleBOM = async (req, res, next) => {
  try {
    const { locationId, productionRuns, batchNumber } = req.body;
    const companyId = req.companyId;
    const bomId = req.params.id;

    if (!locationId || !productionRuns || productionRuns <= 0) {
      return res
        .status(400)
        .json({
          message: "Valid location and positive production runs required.",
        });
    }

    const bom = await BOM.findOne({ _id: bomId, companyId }).populate(
      "rawMaterials.itemId",
    );
    if (!bom) return res.status(404).json({ message: "BOM not found" });

    // 1. VERIFY STOCK: Check if we have enough of EVERY raw material before doing any math
    const stockChecks = [];
    for (const rm of bom.rawMaterials) {
      const totalNeeded = rm.quantityRequired * productionRuns;

      const balances = await StockBalance.find({
        companyId,
        itemId: rm.itemId._id,
        locationId,
        quantity: { $gt: 0 },
      }).sort({ expiryDate: 1, createdAt: 1 }); // FIFO sorting

      const totalAvailable = balances.reduce((sum, b) => sum + b.quantity, 0);

      if (totalAvailable < totalNeeded) {
        return res.status(400).json({
          message: `Assembly failed: Insufficient stock for ${rm.itemId.name}. Need ${totalNeeded}, but only have ${totalAvailable} at this location.`,
        });
      }
      stockChecks.push({ rm, totalNeeded, balances });
    }

    // 2. DEDUCT RAW MATERIALS (Using FIFO)
    for (const check of stockChecks) {
      let remainingToDeduct = check.totalNeeded;

      for (const balance of check.balances) {
        if (remainingToDeduct <= 0) break;

        const deductQty = Math.min(balance.quantity, remainingToDeduct);
        balance.quantity -= deductQty;
        remainingToDeduct -= deductQty;
        await balance.save();

        // Log the consumption transaction
        await Transaction.create({
          companyId,
          itemId: check.rm.itemId._id,
          type: "shop_consumption",
          sourceLocationId: locationId,
          quantityChanged: deductQty,
          newStockLevel: balance.quantity,
          batchNumber: balance.batchNumber,
          performedBy: req.user._id,
        });
      }
    }

    // 3. ADD FINISHED GOOD TO INVENTORY
    const fgQtyToAdd = bom.produceQuantity * productionRuns;
    // If user didn't provide a batch number for the newly manufactured item, auto-generate one
    const fgBatch = batchNumber || `MFG-${Date.now().toString().slice(-6)}`;

    let fgBalance = await StockBalance.findOne({
      companyId,
      itemId: bom.finishedGoodId,
      locationId,
      batchNumber: fgBatch,
    });

    if (fgBalance) {
      fgBalance.quantity += fgQtyToAdd;
      await fgBalance.save();
    } else {
      fgBalance = await StockBalance.create({
        companyId,
        itemId: bom.finishedGoodId,
        locationId,
        quantity: fgQtyToAdd,
        batchNumber: fgBatch,
      });
    }

    // Log the production transaction
    await Transaction.create({
      companyId,
      itemId: bom.finishedGoodId,
      type: "addition",
      destinationLocationId: locationId,
      quantityChanged: fgQtyToAdd,
      newStockLevel: fgBalance.quantity,
      batchNumber: fgBatch,
      performedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: `Successfully assembled ${fgQtyToAdd} units of finished good.`,
      data: fgBalance,
    });
  } catch (error) {
    next(error);
  }
};

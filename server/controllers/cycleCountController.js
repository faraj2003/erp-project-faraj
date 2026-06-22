// server/controllers/cycleCountController.js
const CycleCount = require("../models/CycleCount");
const StockBalance = require("../models/StockBalance");
const Item = require("../models/Item");
const Adjustment = require("../models/Adjustment"); // ── NEW: Added Adjustment Model

// @desc    Get all cycle counts
// @route   GET /api/inventory/cycle-counts
exports.getCycleCounts = async (req, res, next) => {
  try {
    const cycleCounts = await CycleCount.find({ companyId: req.companyId })
      .populate("assignedTo", "name")
      .populate("completedBy", "name")
      .populate("locationId", "name")
      .populate("itemsToCount.itemId", "name sku baseUnit")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: cycleCounts.length, data: cycleCounts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new cycle count audit
// @route   POST /api/inventory/cycle-counts
exports.createCycleCount = async (req, res, next) => {
  try {
    const { locationId, assignedTo, name } = req.body;
    const companyId = req.companyId;

    if (!locationId) {
      return res
        .status(400)
        .json({ message: "Location is required to generate a cycle count." });
    }

    // 1. Fetch all current stock balances for this specific location
    const balances = await StockBalance.find({ companyId, locationId });

    if (balances.length === 0) {
      return res
        .status(400)
        .json({ message: "No active stock found at this location to audit." });
    }

    // 2. Map the current system balances into the items to count
    const itemsToCount = balances.map((balance) => ({
      itemId: balance.itemId,
      expectedQuantity: balance.quantity,
      actualQuantity: null, // To be filled by the worker
      variance: 0,
    }));

    // 3. Create the audit record
    const cycleCount = await CycleCount.create({
      companyId,
      name: name || `Audit-${Date.now().toString().slice(-6)}`,
      locationId,
      assignedTo: assignedTo || null,
      itemsToCount,
    });

    res.status(201).json({ success: true, data: cycleCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an item's counted quantity during an active audit
// @route   PUT /api/inventory/cycle-counts/:id/count
exports.updateCount = async (req, res, next) => {
  try {
    const { itemId, actualQuantity, notes } = req.body;

    if (actualQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Counted quantity cannot be negative." });
    }

    const cycleCount = await CycleCount.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!cycleCount)
      return res.status(404).json({ message: "Cycle count not found." });
    if (cycleCount.status === "completed")
      return res
        .status(400)
        .json({ message: "Cannot edit a completed audit." });

    // Find the specific item in the audit array
    const itemIndex = cycleCount.itemsToCount.findIndex(
      (i) => i.itemId.toString() === itemId,
    );
    if (itemIndex === -1)
      return res
        .status(404)
        .json({ message: "Item not part of this cycle count." });

    // Update values
    cycleCount.itemsToCount[itemIndex].actualQuantity = actualQuantity;
    cycleCount.itemsToCount[itemIndex].variance =
      actualQuantity - cycleCount.itemsToCount[itemIndex].expectedQuantity;
    if (notes) cycleCount.itemsToCount[itemIndex].notes = notes;

    // Mark status as in progress if it was just scheduled
    if (cycleCount.status === "scheduled") cycleCount.status = "in_progress";

    await cycleCount.save();

    res.status(200).json({ success: true, data: cycleCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete the cycle count
// @route   POST /api/inventory/cycle-counts/:id/complete
exports.completeCycleCount = async (req, res, next) => {
  try {
    const cycleCount = await CycleCount.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!cycleCount)
      return res.status(404).json({ message: "Cycle count not found." });

    // Ensure all items have been counted
    const uncountedItems = cycleCount.itemsToCount.filter(
      (i) => i.actualQuantity === null,
    );
    if (uncountedItems.length > 0) {
      return res.status(400).json({
        message: `Cannot complete. ${uncountedItems.length} item(s) have not been counted.`,
      });
    }

    // ── NEW LOGIC: Generate Adjustments for Variances ──
    const adjustmentsToCreate = [];
    for (const item of cycleCount.itemsToCount) {
      if (item.variance !== 0) {
        adjustmentsToCreate.push({
          companyId: cycleCount.companyId,
          itemId: item.itemId,
          locationId: cycleCount.locationId,
          quantityChange: item.variance, // Applies the exact positive or negative offset
          reason: `System Auto-Adjustment: Cycle Count Audit [${cycleCount.name}] variance.`,
          requestedBy: req.user._id,
          status: "pending", // Routes straight into your rules engine
        });
      }
    }

    // Bulk insert all generated adjustments to avoid multiple DB calls
    if (adjustmentsToCreate.length > 0) {
      await Adjustment.insertMany(adjustmentsToCreate);
    }
    // ───────────────────────────────────────────────────

    cycleCount.status = "completed";
    cycleCount.completedAt = Date.now();
    cycleCount.completedBy = req.user._id;

    await cycleCount.save();

    res.status(200).json({
      success: true,
      message: "Cycle count completed successfully.",
      data: cycleCount,
    });
  } catch (error) {
    next(error);
  }
};

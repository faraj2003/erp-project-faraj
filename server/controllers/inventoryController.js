// server/controllers/inventoryController.js
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");

// @desc    Get all items with their multi-location balances
// @route   GET /api/inventory
exports.getItems = async (req, res, next) => {
  try {
    const items = await Item.find().lean();
    const balances = await StockBalance.find()
      .populate("locationId", "name type")
      .lean();

    const itemsWithBalances = items.map((item) => {
      const itemBalances = balances.filter(
        (b) => b.itemId.toString() === item._id.toString(),
      );
      const totalStock = itemBalances.reduce((sum, b) => sum + b.quantity, 0);

      // Calculate secondary stock if the item has a secondary unit configuration
      const secondaryStock = item.conversionFactor
        ? totalStock * item.conversionFactor
        : null;

      return {
        ...item,
        currentStock: totalStock,
        currentSecondaryStock: secondaryStock, // Helpful for frontend display!
        balances: itemBalances,
      };
    });

    res.status(200).json(itemsWithBalances);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new item (catalog only)
// @route   POST /api/inventory
exports.createItem = async (req, res, next) => {
  try {
    // This automatically accepts 'secondaryUnit' and 'conversionFactor'
    // now that they are in the Mongoose schema.
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// @desc    Add stock to a specific location (External receipt)
// @route   POST /api/inventory/:id/stock
exports.addStock = async (req, res, next) => {
  try {
    const { locationId, quantityToAdd } = req.body;
    const itemId = req.params.id;

    if (!locationId || !quantityToAdd || quantityToAdd <= 0) {
      return res
        .status(400)
        .json({ message: "Valid Location and positive quantity required" });
    }

    let balance = await StockBalance.findOne({
      itemId,
      locationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (balance) {
      balance.quantity += Number(quantityToAdd);
      await balance.save();
    } else {
      balance = await StockBalance.create({
        itemId,
        locationId,
        quantity: Number(quantityToAdd),
      });
    }

    await Transaction.create({
      itemId,
      type: "addition",
      destinationLocationId: locationId,
      quantityChanged: quantityToAdd,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock added successfully", balance });
  } catch (error) {
    next(error);
  }
};

// ── NEW: Transfer Stock Between Locations ──
// @desc    Transfer stock from one location to another
// @route   POST /api/inventory/:id/transfer
exports.transferStock = async (req, res, next) => {
  try {
    const { sourceLocationId, destinationLocationId, quantity } = req.body;
    const itemId = req.params.id;
    const transferQty = Number(quantity);

    if (!sourceLocationId || !destinationLocationId || transferQty <= 0) {
      return res.status(400).json({ message: "Invalid transfer parameters" });
    }

    if (sourceLocationId === destinationLocationId) {
      return res
        .status(400)
        .json({ message: "Source and destination cannot be the same" });
    }

    // 1. Check Source Balance
    const sourceBalance = await StockBalance.findOne({
      itemId,
      locationId: sourceLocationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (!sourceBalance || sourceBalance.quantity < transferQty) {
      return res
        .status(400)
        .json({ message: "Insufficient stock at the source location" });
    }

    // 2. Deduct from Source
    sourceBalance.quantity -= transferQty;
    await sourceBalance.save();

    // 3. Add to Destination
    let destBalance = await StockBalance.findOne({
      itemId,
      locationId: destinationLocationId,
      zoneName: "Default",
      rackName: "Default",
    });

    if (destBalance) {
      destBalance.quantity += transferQty;
      await destBalance.save();
    } else {
      await StockBalance.create({
        itemId,
        locationId: destinationLocationId,
        quantity: transferQty,
      });
    }

    // 4. Create Audit Trail
    await Transaction.create({
      itemId,
      type: "transfer",
      sourceLocationId,
      destinationLocationId,
      quantityChanged: transferQty,
      performedBy: req.user._id,
    });

    res.status(200).json({ message: "Stock transferred successfully" });
  } catch (error) {
    next(error);
  }
};

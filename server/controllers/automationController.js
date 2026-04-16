// server/controllers/automationController.js
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const PurchaseOrder = require("../models/PurchaseOrder");
const User = require("../models/User");

// @desc    Run Smart Ordering Engine (Auto-Draft POs)
// @route   POST /api/procurement/auto-order
exports.runSmartOrdering = async (req, res) => {
  try {
    // 1. Find all items that have a default supplier set up
    const itemsToCheck = await Item.find({ defaultSupplier: { $ne: null } });

    let draftsCreated = 0;

    // We need a system user ID to attach to the 'createdBy' field.
    // We'll just grab the first admin in the database.
    const systemAdmin = await User.findOne({ role: "admin" });
    if (!systemAdmin)
      throw new Error("No admin user found to assign auto-orders to.");

    for (const item of itemsToCheck) {
      // 2. Calculate total stock across all locations for this item
      const stocks = await StockBalance.find({ item: item._id });
      const totalStock = stocks.reduce((acc, curr) => acc + curr.quantity, 0);

      // 3. Check if stock has fallen into the RED alert zone
      if (totalStock <= item.alertLevels.red) {
        // 4. Prevent Spam: Check if we ALREADY ordered this item recently
        const existingPO = await PurchaseOrder.findOne({
          "items.item": item._id,
          status: { $in: ["Draft", "Pending Approval", "Approved"] }, // Only check open orders
        });

        if (!existingPO) {
          // 5. Generate the Auto-PO!
          const poNumber = `AUTO-PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9000)}`;

          // Calculate total cost using the item's saved cost per unit
          const orderQty = item.reorderQuantity || 100;
          const unitCost = item.costPerUnit || 0;

          await PurchaseOrder.create({
            poNumber,
            supplier: item.defaultSupplier,
            items: [
              {
                item: item._id,
                quantity: orderQty,
                unitPrice: unitCost,
                total: orderQty * unitCost,
              },
            ],
            totalAmount: orderQty * unitCost,
            status: "Pending Approval", // Sends it straight to manager's queue!
            notes:
              "🤖 SYSTEM AUTO-GENERATED: Stock level reached critical red alert threshold.",
            createdBy: systemAdmin._id,
          });

          draftsCreated++;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Smart Scan Complete. ${draftsCreated} automatic orders generated.`,
      draftsCreated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

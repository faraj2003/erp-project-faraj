// server/controllers/automationController.js
const Item = require("../models/Item");
const StockBalance = require("../models/StockBalance");
const PurchaseOrder = require("../models/PurchaseOrder");

exports.runSmartOrdering = async (req, res) => {
  try {
    // 1. Find all items that have a defined reorder point and a primary supplier
    const itemsToCheck = await Item.find({
      reorderPoint: { $exists: true, $gt: 0 },
      supplier: { $exists: true },
    });

    let draftsCreated = 0;
    const lowStockItems = [];

    // 2. Check current stock levels for each item
    for (const item of itemsToCheck) {
      // Aggregate total stock across all locations for this item
      const stockRecords = await StockBalance.find({ item: item._id });
      const totalQuantity = stockRecords.reduce(
        (acc, stock) => acc + stock.quantity,
        0,
      );

      // 3. If stock is below reorder point, we need to order more
      if (totalQuantity <= item.reorderPoint) {
        lowStockItems.push({
          item,
          currentQuantity: totalQuantity,
          // Order enough to reach the target/maximum stock level, default to 100 if not set
          orderQuantity:
            (item.targetStock || item.reorderPoint * 3) - totalQuantity,
        });
      }
    }

    if (lowStockItems.length === 0) {
      return res
        .status(200)
        .json({
          success: true,
          draftsCreated: 0,
          message: "Inventory levels are healthy.",
        });
    }

    // 4. Group the needed items by Supplier so we don't make 5 POs for the same vendor
    const ordersBySupplier = {};
    lowStockItems.forEach((stockIssue) => {
      const supplierId = stockIssue.item.supplier.toString();
      if (!ordersBySupplier[supplierId]) {
        ordersBySupplier[supplierId] = [];
      }
      ordersBySupplier[supplierId].push({
        item: stockIssue.item._id,
        quantity: stockIssue.orderQuantity,
        unitPrice: stockIssue.item.costPrice || 0, // Fallback to 0 if not set
        total: stockIssue.orderQuantity * (stockIssue.item.costPrice || 0),
      });
    });

    // 5. Generate Draft Purchase Orders
    for (const [supplierId, items] of Object.entries(ordersBySupplier)) {
      const totalAmount = items.reduce(
        (acc, current) => acc + current.total,
        0,
      );
      const poNumber = `AUTO-PO-${Date.now().toString().slice(-6)}`;

      await PurchaseOrder.create({
        poNumber,
        supplier: supplierId,
        items,
        totalAmount,
        status: "Draft", // Keep it as Draft so a manager has to approve it
        notes: "System Generated PO via Smart Inventory Engine",
        createdBy: req.user._id,
      });
      draftsCreated++;
    }

    res.status(200).json({
      success: true,
      draftsCreated,
      message: `Successfully drafted ${draftsCreated} orders.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

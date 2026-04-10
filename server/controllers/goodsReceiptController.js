// server/controllers/goodsReceiptController.js
const mongoose = require("mongoose");
const GoodsReceipt = require("../models/GoodsReceipt");
const PurchaseOrder = require("../models/PurchaseOrder");
const StockBalance = require("../models/StockBalance");
const Transaction = require("../models/Transaction");

// @desc    Submit a GRN (Receive Truck & Update Stock)
// @route   POST /api/procurement/grn
exports.submitGRN = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      purchaseOrderId,
      supplierId,
      receivedItems,
      logistics,
      locationId,
    } = req.body;

    // 1. Verify PO is approved
    const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
    if (!po || po.status === "Draft" || po.status === "Pending Approval") {
      throw new Error("Cannot receive items for a PO that is not Approved.");
    }

    // 2. Create the GRN (The Truck Record)
    const grnNumber = `GRN-${Date.now()}`;
    const batchId = `BATCH-${logistics.vehicleRegistration}-${Date.now()}`; // Crucial for fault tracking

    const grn = new GoodsReceipt({
      grnNumber,
      purchaseOrder: purchaseOrderId,
      supplier: supplierId,
      batchId,
      receivedItems,
      logistics,
      status: "Submitted",
      receivedBy: req.user._id,
    });

    await grn.save({ session });

    // 3. Update Stock and Ledger for each item received
    for (const item of receivedItems) {
      if (item.receivedQuantity > 0) {
        // Find existing stock or create new balance
        let stock = await StockBalance.findOne({
          item: item.item,
          location: locationId,
        }).session(session);

        if (stock) {
          stock.quantity += item.receivedQuantity;
          await stock.save({ session });
        } else {
          await StockBalance.create(
            [
              {
                item: item.item,
                location: locationId,
                quantity: item.receivedQuantity,
              },
            ],
            { session },
          );
        }

        // Create an 'IN' transaction for the audit ledger
        await Transaction.create(
          [
            {
              item: item.item,
              type: "IN",
              quantity: item.receivedQuantity,
              reference: `GRN: ${grnNumber}`,
              location: locationId,
              user: req.user._id,
              date: new Date(),
            },
          ],
          { session },
        );
      }
    }

    // 4. Update PO Status to Partially Received or Fulfilled
    po.status = "Partially Received"; // You can add logic here to check if all quantities match perfectly to set to 'Fulfilled'
    await po.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: grn });
  } catch (error) {
    // If anything fails, rollback everything (no ghost stock updates)
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

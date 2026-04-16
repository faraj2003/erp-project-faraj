// server/seed-procurement-volume.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Supplier = require("./models/Supplier");
const PurchaseOrder = require("./models/PurchaseOrder");
const RFQ = require("./models/RFQ");
const GoodsReceipt = require("./models/GoodsReceipt");
const VendorInvoice = require("./models/VendorInvoice");
const ReturnOrder = require("./models/ReturnOrder");

const seedVolumeData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📦 Connected to Database...");

    const admin = await User.findOne({ role: "admin" });
    const items = await Item.find().limit(5); // Grab up to 5 items

    if (items.length === 0)
      throw new Error("No items found. Run the main system seed first.");

    console.log("🧹 Clearing old procurement data...");
    await Supplier.deleteMany();
    await PurchaseOrder.deleteMany();
    await RFQ.deleteMany();
    await GoodsReceipt.deleteMany();
    await VendorInvoice.deleteMany();
    await ReturnOrder.deleteMany();

    console.log("🏭 Creating Suppliers...");
    const suppliers = await Supplier.insertMany([
      {
        name: "Titanium Steel Corp",
        email: "sales@titanium.com",
        phone: "555-0100",
      },
      {
        name: "Global Plastics Inc",
        email: "orders@globalplastics.com",
        phone: "555-0200",
      },
      {
        name: "Apex Electronics",
        email: "parts@apexelec.com",
        phone: "555-0300",
      },
      {
        name: "National Logistics Hub",
        email: "freight@nlh.com",
        phone: "555-0400",
      },
    ]);

    console.log("📝 Generating Random Purchase Orders...");
    const pos = [];
    for (let i = 0; i < 8; i++) {
      const item = items[i % items.length];
      const supplier = suppliers[i % suppliers.length];
      const qty = Math.floor(Math.random() * 500) + 50;
      const price = Math.floor(Math.random() * 20) + 5;

      const po = await PurchaseOrder.create({
        poNumber: `PO-${Date.now().toString().slice(-4)}-${i}`,
        supplier: supplier._id,
        items: [
          {
            item: item._id,
            quantity: qty,
            unitPrice: price,
            total: qty * price,
          },
        ],
        totalAmount: qty * price,
        // Make some pending, some approved
        status: i < 3 ? "Pending Approval" : "Approved",
        createdBy: admin._id,
        approvedBy: i >= 3 ? admin._id : null,
      });
      pos.push(po);
    }

    console.log("🚚 Generating Random Truck Arrivals (GRNs)...");
    const grns = [];
    // Only receive the approved POs
    for (let i = 3; i < 6; i++) {
      const po = pos[i];
      const itemData = po.items[0];
      const isBroken = i === 4; // Force one delivery to have broken items

      const grn = await GoodsReceipt.create({
        grnNumber: `GRN-${Date.now().toString().slice(-4)}-${i}`,
        purchaseOrder: po._id,
        supplier: po.supplier,
        batchId: `BATCH-VOL-${Math.floor(Math.random() * 9000)}`,
        receivedItems: [
          {
            item: itemData.item,
            expectedQuantity: itemData.quantity,
            receivedQuantity: isBroken
              ? itemData.quantity - 10
              : itemData.quantity,
            rejectedQuantity: isBroken ? 10 : 0,
            unitPrice: itemData.unitPrice,
            landedCostPerUnit: itemData.unitPrice + 1.5,
          },
        ],
        logisticsCosts: { freight: 150, customs: 0, totalExtraCost: 150 },
        logistics: {
          vehicleRegistration: `MH-12-XX-${1000 + i}`,
          waybillNumber: `WB-${554433 + i}`,
        },
        status: "Submitted",
        receivedBy: admin._id,
      });
      grns.push(grn);

      po.status = "Fulfilled";
      await po.save();
    }

    console.log("🧾 Generating Vendor Invoices...");
    for (let i = 0; i < grns.length; i++) {
      const grn = grns[i];
      const isDiscrepancy = i === 1; // Force the second invoice to have a price error
      const itemData = grn.receivedItems[0];

      await VendorInvoice.create({
        invoiceNumber: `INV-${Math.floor(Math.random() * 90000)}`,
        supplier: grn.supplier,
        purchaseOrder: grn.purchaseOrder,
        goodsReceipt: grn._id,
        billedItems: [
          {
            item: itemData.item,
            quantity: itemData.receivedQuantity,
            unitPrice: isDiscrepancy
              ? itemData.unitPrice + 5
              : itemData.unitPrice, // Vendor overcharges!
            total:
              itemData.receivedQuantity *
              (isDiscrepancy ? itemData.unitPrice + 5 : itemData.unitPrice),
          },
        ],
        totalBilledAmount:
          itemData.receivedQuantity *
          (isDiscrepancy ? itemData.unitPrice + 5 : itemData.unitPrice),
        matchStatus: isDiscrepancy ? "Discrepancy" : "Matched",
        discrepancyNotes: isDiscrepancy
          ? "Price Mismatch Detected! Vendor billed higher than PO agreement."
          : "",
        processedBy: admin._id,
      });
    }

    console.log("💔 Generating Returns (RTV)...");
    const brokenGRN = grns[1]; // The one we forced to have 10 broken items
    if (brokenGRN) {
      await ReturnOrder.create({
        rtvNumber: `RTV-${Date.now().toString().slice(-4)}`,
        goodsReceipt: brokenGRN._id,
        supplier: brokenGRN.supplier,
        returnedItems: [
          {
            item: brokenGRN.receivedItems[0].item,
            quantity: 10,
            reason: "Damaged in transit",
          },
        ],
        totalCreditExpected: 10 * brokenGRN.receivedItems[0].unitPrice,
        status: "Initiated",
        initiatedBy: admin._id,
      });
    }

    console.log("🤝 Generating Active Bidding Wars (RFQs)...");
    for (let i = 0; i < 3; i++) {
      const item = items[i % items.length];
      await RFQ.create({
        rfqNumber: `RFQ-VOL-${Date.now().toString().slice(-4)}-${i}`,
        item: item._id,
        targetQuantity: Math.floor(Math.random() * 5000) + 1000,
        deadline: new Date(Date.now() + 86400000 * (i + 2)), // 2 to 4 days from now
        status: "Open",
        createdBy: admin._id,
        bids:
          i === 0
            ? []
            : [
                // Make one RFQ have no bids yet
                {
                  supplier: suppliers[0]._id,
                  quotedPrice: 12.5,
                  promisedDeliveryDate: new Date(),
                },
                {
                  supplier: suppliers[1]._id,
                  quotedPrice: 11.9,
                  promisedDeliveryDate: new Date(),
                },
              ],
      });
    }

    console.log(
      "🎉 SUCCESS! The Procurement Dashboard is now fully populated with random activity!",
    );
    process.exit();
  } catch (error) {
    console.error("❌ Seeding Failed:", error.message);
    process.exit(1);
  }
};

seedVolumeData();

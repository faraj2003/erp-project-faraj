require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Supplier = require("./models/Supplier");
const PurchaseOrder = require("./models/PurchaseOrder");
const RFQ = require("./models/RFQ");

const seedProcurement = async () => {
  try {
    // 1. Connect to Database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📦 Connected to Database...");

    // 2. Fetch existing Admin and Items (We need these for relationships)
    const admin = await User.findOne({ role: "admin" });
    if (!admin)
      throw new Error(
        "No admin user found. Please run your main system seed first.",
      );

    const items = await Item.find().limit(2);
    if (items.length < 2)
      throw new Error("You need at least 2 items in your DB to run this seed.");

    // 3. Clear old test data (Optional, but keeps things clean)
    console.log("🧹 Clearing old procurement data...");
    await Supplier.deleteMany();
    await PurchaseOrder.deleteMany();
    await RFQ.deleteMany();

    // 4. Create Suppliers
    console.log("🏭 Creating Suppliers...");
    const sup1 = await Supplier.create({
      name: "Titanium Steel Corp",
      email: "sales@titanium.com",
      phone: "555-0100",
      taxId: "GST-998877",
    });

    const sup2 = await Supplier.create({
      name: "Global Plastics Inc",
      email: "orders@globalplastics.com",
      phone: "555-0200",
      taxId: "GST-112233",
    });

    // 5. Upgrade an Item for Smart Auto-Ordering (Sprint 2)
    console.log("🤖 Configuring Smart Ordering for item:", items[0].name);
    items[0].defaultSupplier = sup1._id;
    items[0].reorderQuantity = 500;
    items[0].costPerUnit = 15; // Set a base cost
    items[0].alertLevels = { orange: 100, red: 50, critical: 10 };
    await items[0].save();

    // 6. Create an Approved Purchase Order (Ready for GRN)
    console.log("📝 Drafting Approved Purchase Order...");
    await PurchaseOrder.create({
      poNumber: `PO-SEED-${Date.now().toString().slice(-4)}`,
      supplier: sup1._id,
      items: [
        {
          item: items[0]._id,
          quantity: 200,
          unitPrice: 15,
          total: 3000,
        },
      ],
      totalAmount: 3000,
      status: "Approved",
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
      createdBy: admin._id,
      approvedBy: admin._id,
      notes: "Seeded Order for GRN Testing",
    });

    // 7. Create a Bidding War (RFQ - Sprint 4)
    console.log("🤝 Setting up Bidding War...");
    await RFQ.create({
      rfqNumber: `RFQ-SEED-${Date.now().toString().slice(-4)}`,
      item: items[1]._id,
      targetQuantity: 1000,
      deadline: new Date(Date.now() + 86400000 * 5), // 5 days from now
      status: "Open",
      createdBy: admin._id,
      bids: [
        {
          supplier: sup1._id,
          quotedPrice: 12.5,
          promisedDeliveryDate: new Date(Date.now() + 86400000 * 10),
        },
        {
          supplier: sup2._id,
          quotedPrice: 11.9,
          promisedDeliveryDate: new Date(Date.now() + 86400000 * 14),
        },
      ],
    });

    console.log(
      "✅ Procurement Module Successfully Seeded! You can now test the UI.",
    );
    process.exit();
  } catch (error) {
    console.error("❌ Seeding Failed:", error.message);
    process.exit(1);
  }
};

seedProcurement();

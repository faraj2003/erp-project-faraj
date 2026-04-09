// server/seed-mock-data.js
require("dotenv").config();
const mongoose = require("mongoose");
const Company = require("./models/Company");
const User = require("./models/User");
const Location = require("./models/Location");
const Category = require("./models/Category");
const Item = require("./models/Item");
const StockBalance = require("./models/StockBalance");
const Transaction = require("./models/Transaction");
const Order = require("./models/Order");

const seedMockData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected for Mock Seeding...");

    // 1. Get Base Context
    const company = await Company.findOne({ name: "FactoryFlow HQ" });
    if (!company)
      throw new Error("Run 'node seed.js' first to create the company.");

    let manager = await User.findOne({ email: "faraj@factoryflow.com" });
    if (!manager) {
      manager = await User.create({
        name: "Faraj",
        email: "faraj@factoryflow.com",
        password: "password123",
        role: "manager",
        companyId: company._id,
      });
    }

    // 2. Create Realistic Locations (FIXED: returnDocument: "after")
    const locMain = await Location.findOneAndUpdate(
      { name: "Pune Main Warehouse", companyId: company._id },
      { type: "Warehouse" },
      { upsert: true, returnDocument: "after" },
    );
    const locAssembly = await Location.findOneAndUpdate(
      { name: "Hinjewadi Assembly Line", companyId: company._id },
      { type: "Shop" },
      { upsert: true, returnDocument: "after" },
    );
    const locScrap = await Location.findOneAndUpdate(
      { name: "Scrap Yard", companyId: company._id },
      { type: "Scrap" },
      { upsert: true, returnDocument: "after" },
    );

    // 3. Create Categories
    const catRaw = await Category.findOneAndUpdate(
      { name: "Raw Materials", companyId: company._id },
      {},
      { upsert: true, returnDocument: "after" },
    );
    const catElectronics = await Category.findOneAndUpdate(
      { name: "Electronics", companyId: company._id },
      {},
      { upsert: true, returnDocument: "after" },
    );

    // 4. Create Items
    const rawItem1 = await Item.findOneAndUpdate(
      { sku: "RAW-001", companyId: company._id },
      {
        name: "Lithium-Ion Cell",
        productCompanyName: "PowerTech",
        type: "raw_material",
        categoryId: catRaw._id,
        baseUnit: "Piece",
        costPerUnit: 2.5,
        alertLevels: { orange: 500, red: 200, critical: 50 },
      },
      { upsert: true, returnDocument: "after" },
    );

    const rawItem2 = await Item.findOneAndUpdate(
      { sku: "RAW-002", companyId: company._id },
      {
        name: "Circuit Board V2",
        productCompanyName: "MicroSys",
        type: "raw_material",
        categoryId: catElectronics._id,
        baseUnit: "Piece",
        costPerUnit: 5.0,
        alertLevels: { orange: 300, red: 100, critical: 20 },
      },
      { upsert: true, returnDocument: "after" },
    );

    const fgItem = await Item.findOneAndUpdate(
      { sku: "FG-100", companyId: company._id },
      {
        name: "Smart Controller Unit",
        productCompanyName: "FactoryFlow",
        type: "finished_good",
        categoryId: catElectronics._id,
        baseUnit: "Piece",
        valuePerUnit: 45.0,
        alertLevels: { orange: 100, red: 50, critical: 10 },
      },
      { upsert: true, returnDocument: "after" },
    );

    console.log("📦 Mock Items created...");

    // 5. Seed Initial Stock Balances & Receive Transactions
    await StockBalance.deleteMany({ companyId: company._id });
    await Transaction.deleteMany({ companyId: company._id });
    await Order.deleteMany({ companyId: company._id });

    const initialStockMap = [
      { item: rawItem1, qty: 1200, loc: locMain },
      { item: rawItem2, qty: 800, loc: locMain },
      { item: fgItem, qty: 50, loc: locMain },
    ];

    for (const stock of initialStockMap) {
      await StockBalance.create({
        companyId: company._id,
        itemId: stock.item._id,
        locationId: stock.loc._id,
        quantity: stock.qty,
      });

      // Simulate a receipt transaction from 30 days ago
      await Transaction.create({
        companyId: company._id,
        itemId: stock.item._id,
        type: "addition",
        destinationLocationId: stock.loc._id,
        quantityChanged: stock.qty,
        performedBy: manager._id,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
    }

    console.log("🏢 Initial stock populated...");

    // 6. Simulate Completed Orders
    const createHistoricalOrder = async (
      orderNum,
      daysAgo,
      qtyProduced,
      cellsUsed,
      boardsUsed,
      cellsScrapped,
    ) => {
      const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const order = await Order.create({
        companyId: company._id,
        orderNumber: orderNum,
        managerId: manager._id,
        locationId: locAssembly._id,
        status: "Completed",
        notes: "Historical mock production run.",
        inputs: [
          {
            itemId: rawItem1._id,
            quantityRequired: cellsUsed,
            quantityUtilized: cellsUsed,
            quantityScrapped: cellsScrapped,
            unitCost: rawItem1.costPerUnit,
          },
          {
            itemId: rawItem2._id,
            quantityRequired: boardsUsed,
            quantityUtilized: boardsUsed,
            quantityScrapped: 0,
            unitCost: rawItem2.costPerUnit,
          },
        ],
        outputs: [
          {
            itemId: fgItem._id,
            quantityProduced: qtyProduced,
            unitValue: fgItem.valuePerUnit,
          },
        ],
        financials: {
          totalMaterialCost:
            cellsUsed * rawItem1.costPerUnit +
            boardsUsed * rawItem2.costPerUnit,
          totalProductionValue: qtyProduced * fgItem.valuePerUnit,
        },
        createdAt: orderDate,
      });

      // Deduct inputs from Main Warehouse
      await StockBalance.findOneAndUpdate(
        {
          companyId: company._id,
          itemId: rawItem1._id,
          locationId: locMain._id,
        },
        { $inc: { quantity: -(cellsUsed + cellsScrapped) } },
      );
      await StockBalance.findOneAndUpdate(
        {
          companyId: company._id,
          itemId: rawItem2._id,
          locationId: locMain._id,
        },
        { $inc: { quantity: -boardsUsed } },
      );

      // Add outputs to Main Warehouse
      await StockBalance.findOneAndUpdate(
        { companyId: company._id, itemId: fgItem._id, locationId: locMain._id },
        { $inc: { quantity: qtyProduced } },
      );

      // Log Consumption Transactions
      await Transaction.create([
        {
          companyId: company._id,
          itemId: rawItem1._id,
          orderId: order._id,
          type: "shop_consumption",
          sourceLocationId: locMain._id,
          quantityChanged: cellsUsed,
          performedBy: manager._id,
          createdAt: orderDate,
        },
        {
          companyId: company._id,
          itemId: rawItem2._id,
          orderId: order._id,
          type: "shop_consumption",
          sourceLocationId: locMain._id,
          quantityChanged: boardsUsed,
          performedBy: manager._id,
          createdAt: orderDate,
        },
        {
          companyId: company._id,
          itemId: rawItem1._id,
          orderId: order._id,
          type: "scrap_return",
          sourceLocationId: locMain._id,
          destinationLocationId: locScrap._id,
          quantityChanged: cellsScrapped,
          performedBy: manager._id,
          createdAt: orderDate,
        },
        {
          companyId: company._id,
          itemId: fgItem._id,
          orderId: order._id,
          type: "addition",
          destinationLocationId: locMain._id,
          quantityChanged: qtyProduced,
          performedBy: manager._id,
          createdAt: orderDate,
        },
      ]);
    };

    await createHistoricalOrder("PO-2026-001", 25, 100, 200, 100, 5);
    await createHistoricalOrder("PO-2026-002", 15, 150, 300, 150, 12);
    await createHistoricalOrder("PO-2026-003", 5, 200, 400, 200, 8);

    console.log("🏭 Historical Orders and Transactions processed...");
    console.log(
      "✅ Mock Data Seeding Complete! Your dashboard will now display real metrics.",
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding mock data:", error);
    process.exit(1);
  }
};

seedMockData();

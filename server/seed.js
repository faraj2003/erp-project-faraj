// server/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Company = require("./models/Company");
const Unit = require("./models/Unit");
const Location = require("./models/Location");
const Category = require("./models/Category");

const seedDatabase = async () => {
  try {
    // 1. Connect to Database using your .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected...");

    // 2. Create a Default Company (Required by PRD-INV-037)
    const company = await Company.findOneAndUpdate(
      { name: "FactoryFlow HQ" },
      { name: "FactoryFlow HQ" },
      { upsert: true, new: true },
    );
    console.log(`🏢 Company ready: ${company.name}`);

    // --- CORE SEEDING START ---

    // 3. Seed Core Units
    const unitCount = await Unit.countDocuments({ companyId: company._id });
    if (unitCount === 0) {
      await Unit.insertMany([
        {
          companyId: company._id,
          name: "Piece",
          abbreviation: "pcs",
          isCore: true,
        },
        {
          companyId: company._id,
          name: "Box",
          abbreviation: "box",
          isCore: true,
        },
        {
          companyId: company._id,
          name: "Kilogram",
          abbreviation: "kg",
          isCore: true,
        },
        {
          companyId: company._id,
          name: "Liter",
          abbreviation: "L",
          isCore: true,
        },
      ]);
      console.log("📏 Core Units seeded!");
    } else {
      console.log("📏 Core Units already exist.");
    }

    // 4. Seed Default Location
    const locCount = await Location.countDocuments({ companyId: company._id });
    if (locCount === 0) {
      await Location.create({
        companyId: company._id,
        name: "Main Warehouse",
        type: "Warehouse",
      });
      console.log("📍 Default Location seeded!");
    } else {
      console.log("📍 Locations already exist.");
    }

    // 5. Seed Default Categories
    const catCount = await Category.countDocuments({ companyId: company._id });
    if (catCount === 0) {
      await Category.insertMany([
        { companyId: company._id, name: "Components" },
        { companyId: company._id, name: "Packaging" },
      ]);
      console.log("🗂️ Default Categories seeded!");
    } else {
      console.log("🗂️ Categories already exist.");
    }

    // --- CORE SEEDING END ---

    // 6. Create the Admin User
    const adminExists = await User.findOne({ email: "admin@test.com" });

    if (adminExists) {
      console.log("⚠️ Admin user already exists! You can log in.");
    } else {
      const adminUser = await User.create({
        name: "Super Admin",
        email: "admin@test.com",
        password: "16122003", // The pre-save hook in your User model will hash this
        role: "admin",
        companyId: company._id,
      });
      console.log("👤 Admin User created successfully!");
      console.log("---------------------------------");
      console.log(`Email: ${adminUser.email}`);
      console.log("Password: password123");
      console.log("---------------------------------");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();

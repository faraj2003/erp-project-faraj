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
      { upsert: true, returnDocument: "after" }, // Fixed Mongoose warning
    );
    console.log(`🏢 Company ready: ${company.name}`);

    // --- CORE SEEDING START ---

    // 3. Seed Core Units safely (Check if exists first to avoid update hooks)
    const coreUnits = [
      { name: "Piece", abbreviation: "pcs" },
      { name: "Box", abbreviation: "box" },
      { name: "Dozen", abbreviation: "dz" },
      { name: "Pack", abbreviation: "pk" },
      { name: "Roll", abbreviation: "rl" },
      { name: "Pair", abbreviation: "pr" },
      { name: "Set", abbreviation: "set" },
      { name: "Pallet", abbreviation: "plt" },
      { name: "Carton", abbreviation: "ctn" },
      { name: "Case", abbreviation: "cs" },
      { name: "Kilogram", abbreviation: "kg" },
      { name: "Gram", abbreviation: "g" },
      { name: "Milligram", abbreviation: "mg" },
      { name: "Pound", abbreviation: "lb" },
      { name: "Ounce", abbreviation: "oz" },
      { name: "Ton", abbreviation: "t" },
      { name: "Liter", abbreviation: "L" },
      { name: "Milliliter", abbreviation: "mL" },
      { name: "Gallon", abbreviation: "gal" },
      { name: "Fluid Ounce", abbreviation: "fl oz" },
      { name: "Cubic Meter", abbreviation: "m³" },
      { name: "Meter", abbreviation: "m" },
      { name: "Centimeter", abbreviation: "cm" },
      { name: "Millimeter", abbreviation: "mm" },
      { name: "Inch", abbreviation: "in" },
      { name: "Foot", abbreviation: "ft" },
      { name: "Square Meter", abbreviation: "sqm" },
      { name: "Square Foot", abbreviation: "sqft" },
    ];

    let unitsAdded = 0;
    for (const unit of coreUnits) {
      const exists = await Unit.findOne({
        companyId: company._id,
        name: unit.name.toLowerCase(),
      });

      if (!exists) {
        await Unit.create({
          companyId: company._id,
          name: unit.name,
          abbreviation: unit.abbreviation,
          isCore: true,
        });
        unitsAdded++;
      }
    }
    console.log(
      `📏 ${unitsAdded} new Core Units added! (Total verified: ${coreUnits.length})`,
    );

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
        password: "16122003",
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

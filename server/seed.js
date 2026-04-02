// server/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Company = require("./models/Company");

const seedDatabase = async () => {
  try {
    // 1. Connect to Database using your .env file
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected...");

    // 2. Create a Default Company (Required by PRD-INV-037)
    // We use findOneAndUpdate with upsert to avoid creating duplicates if you run it twice
    const company = await Company.findOneAndUpdate(
      { name: "FactoryFlow HQ" },
      { name: "FactoryFlow HQ" },
      { upsert: true, new: true },
    );
    console.log(`🏢 Company ready: ${company.name}`);

    // 3. Create the Admin User
    const adminExists = await User.findOne({ email: "admin@test.com" });

    if (adminExists) {
      console.log("⚠️ Admin user already exists! You can log in.");
    } else {
      const adminUser = await User.create({
        name: "Super Admin",
        email: "admin@test.com",
        password: "16122003", // Your pre-save hook will hash this automatically!
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

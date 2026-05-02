require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

// We need a Company model to satisfy the requirement
// If you don't have a separate Company.js file, Mongoose can create one on the fly here
const CompanySchema = new mongoose.Schema({ name: String });
const Company =
  mongoose.models.Company || mongoose.model("Company", CompanySchema);

const seedAdmin = async () => {
  try {
    const DB_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/factoryflow";
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to database for seeding...");

    // 1. Create a default Company first
    let company = await Company.findOne({ name: "FactoryFlow HQ" });
    if (!company) {
      company = await Company.create({ name: "FactoryFlow HQ" });
      console.log("🏢 Default Company created.");
    }

    // 2. Define the Admin User with the companyId
    const adminEmail = "admin@factoryflow.com";
    const existingUser = await User.findOne({ email: adminEmail });

    if (existingUser) {
      console.log("⚠️ Admin user already exists.");
      process.exit();
    }

    // 3. Create the User with the required companyId
    await User.create({
      name: "System Administrator",
      email: adminEmail,
      password: "AdminPassword123",
      role: "admin",
      companyId: company._id, // Associating the user with the company we just found/created
    });

    console.log("🚀 Admin user created successfully!");
    console.log(`Email: ${adminEmail}`);
    console.log("Password: AdminPassword123");

    process.exit();
  } catch (error) {
    console.error("❌ Error seeding user:", error);
    process.exit(1);
  }
};

seedAdmin();

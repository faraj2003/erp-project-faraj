const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // This tells Mongoose to connect using the secret URL in your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`[Database] Connection Error: ${error.message}`);
    // If the database connection fails, we shut down the server to prevent errors
    process.exit(1);
  }
};

module.exports = connectDB;

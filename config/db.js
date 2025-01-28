const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Log to check if environment variables are loaded correctly
console.log("MONGO_URI:", process.env.MONGO_URI);

const { MONGO_URI } = process.env;

const connectDB = () => {
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Wait for 10 seconds before timing out
      socketTimeoutMS: 45000, // 45 seconds
    })
    .then(() => {
      console.log("Successfully connected to MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err);
    });
};

module.exports = connectDB;
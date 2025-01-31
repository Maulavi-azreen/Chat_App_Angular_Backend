const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Log to check if environment variables are loaded correctly
console.log("MONGOURL:", process.env.MONGO_URI);

const { MONGO_URI } = process.env;

mongoose.set("strictQuery", true);

const connectDB = () => {
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // dbName: "Chat_App",
      connectTimeoutMS: 30000, 
    })
    .then(() => {
      console.log("Successfully connected to MongoDB");
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err);
    });
};

module.exports = connectDB;

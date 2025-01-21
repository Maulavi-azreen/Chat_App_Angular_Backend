const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http"); // Required for Socket.IO
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const fileRoutes = require("./routes/fileRoutes");
const { socketHandler } = require("./sockets/socketHandler");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express
const app = express();

// Configure CORS
const corsOptions = {
  origin: "http://localhost:4200", // Replace with the frontend's URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed methods
  credentials: true, // Allow cookies or other credentials if required
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
};

app.use(cors(corsOptions));

// Middleware for JSON parsing
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Request Headers:", req.headers);
  console.log("Request Body:", req.body);
  next();
});

// Define routes
app.use("/api/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/files", fileRoutes);

// Create HTTP server for Express and Socket.IO
const server = http.createServer(app);

// Set up Socket.IO with the same CORS options
const io = new Server(server, {
  cors: corsOptions,
});

// Store io and online users in Express for easy access
const onlineUsers = new Map();
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// Pass the Socket.IO instance to the socket handler
socketHandler(io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

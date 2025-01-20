
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require('./routes/chatRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes= require('./routes/notificationRoutes');
const fileRoutes = require('./routes/fileRoutes');

const http = require('http'); // Required for Socket.IO
const { Server } = require('socket.io');

const { socketHandler } = require('./sockets/socketHandler');
dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', fileRoutes);

// Create HTTP Server for Express and Socket.IO
const server = http.createServer(app);
const onlineUsers = new Map();
console.log([...onlineUsers.keys()]); // List of connected user IDs

// Socket.IO Setup
const io = new Server(server, {
    cors: {
      origin: 'http://localhost:4200', // Update with your Angular frontend URL
      methods: ['GET', 'POST'],
    },
  });
  app.set('onlineUsers', onlineUsers);
app.set('io', io);
  // Pass the Socket.IO instance to a dedicated handler
  socketHandler(io);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

const Message = require('../models/messageModel');

const onlineUsers = new Map();

exports.socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    // Log the initial state of onlineUsers when a new socket connects
    console.log("Current online users (initially):", [...onlineUsers]);

    // Handle user coming online
    socket.on("userConnected", (userId) => {
      console.log("User Id", userId);
      if (userId) {
        onlineUsers.set(userId, socket.id); // Store socket ID
        console.log("Online users after userConnected:", [...onlineUsers]); // Log updated onlineUsers
        io.emit("userStatus", { userId, status: "online" });
      }
    });

    socket.on("checkUserStatus", (userId) => {
      const status = onlineUsers.has(userId) ? "online" : "offline";
      console.log(`Check status for userId ${userId}:`, status);
      socket.emit("userStatus", { userId, status });
    });

    // **Handle Receiving Messages**
    socket.on(" ", (message) => {
      const { receiverId } = message;
      console.log("Receiever id",receiverId);

      if (!receiverId) {
        console.error("receiveMessage event received with missing receiverId.");
        return;
      }

      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", message);
        console.log(`📩 Message delivered to user ${receiverId}`);
      } else {
        console.log(
          `User ${receiverId} is offline. Message will be delivered when they come online.`
        );
      }
    });

    // Typing Indicator
    socket.on("typing", ({ chatId, senderId, senderName }) => {
      console.log(`✍️ Received typing event:`, { chatId, senderId, senderName });
      if (!chatId || !senderId || !senderName) {
        console.error("❌ Typing event received with missing data.", { chatId, userId, userName });
        return;
      }
    
      console.log(`✍️ User ${senderName} (${senderId}) is typing in chat ${chatId}`);
      
      // Emit typing event to everyone in the chat (except the sender)
      socket.to(chatId).emit("typing", { chatId, senderId, senderName });
    });
    
    socket.on("stopTyping", ({ chatId, senderId }) => {
      if (!chatId || !senderId) {
        console.error("❌ StopTyping event received with missing data.", { chatId, senderId });
        return;
      }
    
      console.log(`🛑 User ${senderId} stopped typing in chat ${chatId}`);
      
      // Emit stopTyping event to everyone in the chat (except the sender)
      socket.to(chatId).emit("stopTyping", { chatId, senderId });
    });

  

    // Handle Disconnection
    socket.on("disconnect", () => {
      let disconnectedUserId = null;

      // Find and remove the disconnected user
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          console.log(`User ${userId} went offline.`);
          break;
        }
      }

      if (disconnectedUserId) {
        // Notify all users about the user's offline status
        io.emit("userStatus", {
          userId: disconnectedUserId,
          status: "offline",
        });
        console.log(`User ${disconnectedUserId} went offline.`);
      }

      console.log(`Socket ${socket.id} disconnected.`);
    });
  });

    // Attach io instance globally so it can be accessed in messageController
    io.onlineUsers = onlineUsers;
};

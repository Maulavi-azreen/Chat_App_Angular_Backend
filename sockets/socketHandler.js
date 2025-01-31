const onlineUsers = new Map();

exports.socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
     // Log the initial state of onlineUsers when a new socket connects
     console.log('Current online users (initially):', [...onlineUsers]);

      // Handle user coming online
      socket.on('userConnected', (userId) => {
        console.log("User Id",userId);
        if (userId) {
          onlineUsers.set(userId, socket.id); // Store socket ID
          console.log("Online users after userConnected:", [...onlineUsers]); // Log updated onlineUsers
          io.emit('userStatus', { userId, status: 'online' });
        }
      });

       socket.on('checkUserStatus', (userId) => {
      const status = onlineUsers.has(userId) ? 'online' : 'offline';
      console.log(`Check status for userId ${userId}:`, status);
      socket.emit('userStatus', { userId, status });
    });

        // **Handle Sending Messages in Real-Time**
    socket.on('sendMessage', async (data) => {
      const { senderId, receiverId, chatId, message } = data;

      if (!senderId || !receiverId || !chatId || !message) {
        console.error('sendMessage event received with missing data.');
        return;
      }

      try {
        // Save the message in the database
        const newMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          chat: chatId,
          content: message,
        });

        const savedMessage = await newMessage.save();

        // Populate sender and receiver details
        await savedMessage.populate('sender', 'name avatar');
        await savedMessage.populate('receiver', 'name avatar');

        // Send message to receiver in real-time
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', savedMessage);
        }

        console.log(`Message sent from ${senderId} to ${receiverId}: ${message}`);
      } catch (error) {
        console.error('Error handling sendMessage event:', error);
      }
    });

  


    // Typing Indicator
    socket.on('typing', ({ chatId, userId }) => {
      if (!chatId || !userId) {
        console.error('typing event received with missing data.');
        return;
      }

      socket.to(chatId).emit('typing', { userId });
      console.log(`User ${userId} is typing in chat ${chatId}`);
    });

    socket.on('stopTyping', ({ chatId, userId }) => {
      if (!chatId || !userId) {
        console.error('stopTyping event received with missing data.');
        return;
      }

      socket.to(chatId).emit('stopTyping', { userId });
      console.log(`User ${userId} stopped typing in chat ${chatId}`);
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
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
        io.emit('userStatus', { userId: disconnectedUserId, status: 'offline' });
        console.log(`User ${disconnectedUserId} went offline.`);
      }

      console.log(`Socket ${socket.id} disconnected.`);
    });
  });
};

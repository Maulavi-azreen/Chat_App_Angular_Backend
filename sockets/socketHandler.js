const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');


// Store online users with their socket IDs
const onlineUsers = new Map();

exports.socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user coming online
    socket.on('userOnline', (userId) => {
      if (!userId) {
        console.error('userOnline event received without userId.');
        return;
      }

      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online.`);
      
      // Notify all users about the user's online status
      io.emit('userStatus', { userId, status: 'online' });
    });

    // Join a Chat Room
    socket.on('joinRoom', ({ userId, chatId }) => {
      if (!userId || !chatId) {
        console.error('joinRoom event received with missing userId or chatId.');
        return;
      }

      socket.join(chatId);
      console.log(`User ${userId} joined room ${chatId}`);
    });

    // Handle Sending Messages
    socket.on('sendMessage', async (messageData) => {
      const { chatId, senderId, content } = messageData;

      if (!chatId || !senderId || !content) {
        console.error('sendMessage event received with incomplete data.');
        return;
      }

      try {
        // Save the message to the database
        const newMessage = await Message.create({
          sender: senderId,
          content,
          chat: chatId,
        });

        const populatedMessage = await newMessage
          .populate('sender', 'name profilePic')
          .populate({
            path: 'chat',
            populate: {
              path: 'users',
              select: 'name profilePic email',
            },
          });

        // Update latest message in the chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage });

        // Emit the new message to the chat room
        io.to(chatId).emit('message', populatedMessage);
        console.log(`Message sent to chat ${chatId} by user ${senderId}`);
      } catch (error) {
        console.error('Error in sendMessage:', error.message);
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

    // Notifications
    socket.on('sendNotification', async ({ recipientId, type, message }) => {
      if (!recipientId || !type || !message) {
        console.error('sendNotification event received with incomplete data.');
        return;
      }

      try {
        const notification = await Notification.create({
          user: recipientId,
          type,
          message,
        });

        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('notification', notification);
          console.log(`Notification sent to user ${recipientId}`);
        }
      } catch (error) {
        console.error('Error in sendNotification:', error.message);
      }
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
      }

      console.log(`Socket ${socket.id} disconnected.`);
    });
  });
};

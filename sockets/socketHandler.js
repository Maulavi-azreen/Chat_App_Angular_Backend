const Chat = require('../models/chatModel');
const Message = require('../models/messageModel');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

const onlineUsers = new Map();

exports.socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for user online status
    socket.on('userOnline', (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is online.`);

        // Notify all users about the online status
  io.emit('userStatus', { userId, status: 'online' });
    });

    // Join a Chat Room
    socket.on('joinRoom', ({ userId, chatId }) => {
      socket.join(chatId);
      console.log(`User ${userId} joined room ${chatId}`);
    });

    // Handle Sending Messages
    socket.on('sendMessage', async (messageData) => {
      const { chatId, senderId, content } = messageData;

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
      } catch (error) {
        console.error('Error in sendMessage:', error.message);
      }
    });

    // Typing Indicator
    socket.on('typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('typing', { userId });
    });

    socket.on('stopTyping', ({ chatId, userId }) => {
      socket.to(chatId).emit('stopTyping', { userId });
    });

    // Notifications
    socket.on('sendNotification', async ({ recipientId, type, message }) => {
      try {
        const notification = await Notification.create({
          user: recipientId,
          type,
          message,
        });

        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('notification', notification);
        }
      } catch (error) {
        console.error('Error in sendNotification:', error.message);
      }
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
      onlineUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} went offline.`);
          // Notify all users about the offline status
      io.emit('userStatus', { userId, status: 'offline' });
      console.log(`User ${userId} disconnected.`);
        }
      });
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

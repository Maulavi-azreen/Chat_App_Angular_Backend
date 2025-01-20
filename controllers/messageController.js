const Message = require('../models/messageModel');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const { io } = require('../sockets/socketHandler');

// @desc Send a message
// @route POST /api/message
// @access Private
// Pass io to the sendMessage function
exports.sendMessage = (io) => async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: 'Content and chatId are required' });
  }

  try {
    const newMessage = {
      sender: req.user._id,
      content,
      chat: chatId,
    };

    // Create the message
    const createdMessage = await Message.create(newMessage);

    // Fetch the message with population
    const message = await Message.findById(createdMessage._id)
      .populate('sender', 'name profilePic')
      .populate({
        path: 'chat',
        populate: { path: 'users', select: 'name profilePic email' },
      });

    // Update the latestMessage in the Chat model
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    // Emit the message event using io
    io.to(chatId).emit('message', message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc Fetch all messages of a chat
// @route GET /api/message/:chatId
// @access Private
exports.getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name profilePic email')
      .populate('chat');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

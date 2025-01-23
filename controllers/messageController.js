const Message = require('../models/messageModel');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');
const { io } = require('../sockets/socketHandler');

// @desc Send a message
// @route POST /api/message
// @access Private
// Pass io to the sendMessage function
exports.sendMessage = async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: 'Content and chatId are required.' });
  }

  try {
    // Create the message
    const newMessage = {
      sender: req.user._id,
      content: content,
      chat: chatId,
    };

    const message = await Message.create(newMessage);

    // Populate sender and chat fields
    const fullMessage = await Message.findById(message._id)
      .populate('sender', 'name pic email')
      .populate('chat');

    // Update the chat's latestMessage field
    await Chat.findByIdAndUpdate(chatId, { latestMessage: fullMessage._id });

    res.status(201).json(fullMessage); // Return the created message
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
      .populate('chat')
      .populate('replyTo');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get msg by ID
// @route GET /api/message/:messageId
// @access Private
exports.getMessageById = async (req, res) => {
  try {
    const messageId = req.params.messageId;

    // Fetch message and populate replyTo field
    const message = await Message.findById(messageId)
      .populate({
        path: 'replyTo',
        select: 'content sender createdAt', // Selecting only needed fields
        populate: { path: 'sender', select: 'name email' } // Populate sender details too
      })
      .exec();

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.status(200).json(message);
  } catch (error) {
    console.error('Error fetching message by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// @desc Mark a message as read by the user
// @route PUT /api/message/read/:messageId
// @access Private
exports.markAsRead = async (req, res) => {
  const { messageId } = req.params; // Get the messageId from the route params
  const userId = req.user._id; // The current logged-in user

  if (!messageId) {
    return res.status(400).json({ message: 'MessageId is required' });
  }

  try {
    // Find the message by ID
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Ensure `readBy` array is not undefined or malformed
    if (!Array.isArray(message.readBy)) {
      message.readBy = [];
    }

    // Check if the user already read the message
    const alreadyRead = message.readBy.some(
      (reader) => reader && reader.userId?.toString() === userId.toString()
    );

    if (alreadyRead) {
      return res.status(200).json({ message: 'Message already read by this user' });
    }

    // Add the user to the readBy array with ID and username
    message.readBy.push({ userId, username: req.user.name });

    // Save the updated message
    await message.save();

    // Return the updated message with populated user details
    const updatedMessage = await Message.findById(messageId).populate('readBy.userId', '-password');

    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc Delete a message
// @route PUT /api/message/delete/:chatId/:messageId  
// @access Private
exports.deleteMessage = async (req, res) => {
  const { messageId, chatId } = req.params; // messageId and chatId passed as params
  const userId = req.user._id; // The user performing the action (should be in req.user)

  try {
    // Find the message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the chat exists and retrieve chat info
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if the user is either the sender or an admin of the group
    if (message.sender.toString() !== userId.toString()) {
      // If not the sender, check if the chat is a group chat and if the user is an admin
      if (chat.type === 'group' && !chat.admins.includes(userId)) {
        return res.status(403).json({ message: 'You are not authorized to delete this message' });
      }
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Optionally: Update the latestMessage in the chat model
    if (chat.type === 'group') {
      const latestMessage = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 });
      await Chat.findByIdAndUpdate(chatId, { latestMessage });
    }

    // Emit the deletion event to the chat room (real-time update)
    const io = req.app.get('io');
    io.to(chatId).emit('messageDeleted', { messageId, senderId: message.sender });

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Edit a message
// @route PUT /api/message/edit/:messageId
// @access Private
exports.editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    message.content = content;
    message.editedAt = Date.now();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('sender', 'name profilePic')
      .populate('readBy', 'name profilePic');

    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Reply to a message
// @route POST /api/message/reply/:messageId
// @access Private
exports.replyToMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content, chatId } = req.body;
  const userId = req.user._id;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    // Find the original message being replied to
    const originalMessage = await Message.findById(messageId);

    if (!originalMessage) {
      return res.status(404).json({ message: 'Original message not found' });
    }

    // Create the reply message
    const replyMessage = new Message({
      content,
      sender: userId,
      chat: chatId,
      replyTo: messageId, // Reference to the original message
    });

    await replyMessage.save();

    // Populate sender and replied message details
    const populatedReply = await Message.findById(replyMessage._id)
      .populate('sender', 'name pic email')
      .populate('replyTo', 'content sender createdAt')
      .exec();

    res.status(201).json({
      message: 'Reply sent successfully',
      reply: {
        ...populatedReply.toObject(),
        replyContent: content,  // Include the reply content for easier frontend access
        replyToContent: originalMessage.content, // Send the content of the original message
      },
    });
  } catch (error) {
    console.error('Reply message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc React to a message
// @route POST /api/message/react/:messageId
// @access Private
exports.reactToMessage = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body; // e.g., 👍, ❤️, 😂
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the user already reacted to the message
    const existingReactionIndex = message.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId.toString()
    );

    if (existingReactionIndex !== -1) {
      // Update the existing reaction
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    res.status(200).json({ message: 'Reaction updated', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Pin a message
// @route PUT /api/message/pin/:messageId
// @access Private (Admin or Sender)
exports.pinMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    const chat = await Chat.findById(message.chat);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString() && !chat.admins.includes(userId)) {
      return res.status(403).json({ message: 'You are not authorized to pin this message' });
    }

    message.isPinned = true;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Unpin a message
// @route PUT /api/message/unpin/:messageId
// @access Private (Admin or Sender)
exports.unpinMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    const chat = await Chat.findById(message.chat);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString() && !chat.admins.includes(userId)) {
      return res.status(403).json({ message: 'You are not authorized to unpin this message' });
    }

    message.isPinned = false;
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Search messages in a chat
// @route GET /api/message/search/:chatId
// @access Private
exports.searchMessages = async (req, res) => {
  const { chatId } = req.params;
  const { query } = req.query;

  try {
    const messages = await Message.find({
      chat: chatId,
      content: { $regex: query, $options: 'i' }, // Case-insensitive search
    }).populate('sender', 'name profilePic');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Export chat history
// @route GET /api/message/export/:chatId
// @access Private
exports.exportChatHistory = async (req, res) => {
  const { chatId } = req.params;

  try {
    const messages = await Message.find({ chat: chatId }).populate('sender', 'name profilePic');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Mute a chat
// @route PUT /api/message/mute/:chatId
// @access Private
exports.muteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (user.mutedChats.includes(chatId)) {
      return res.status(200).json({ message: 'Chat already muted' });
    }

    user.mutedChats.push(chatId);
    await user.save();

    res.status(200).json({ message: 'Chat muted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Unmute a chat
// @route PUT /api/message/unmute/:chatId
// @access Private
exports.unmuteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (!user.mutedChats.includes(chatId)) {
      return res.status(400).json({ message: 'Chat not muted' });
    }

    user.mutedChats = user.mutedChats.filter(id => !id.equals(chatId));
    await user.save();

    res.status(200).json({ message: 'Chat unmuted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

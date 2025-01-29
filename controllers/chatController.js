const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc Create or fetch a one-to-one chat
// @route POST /api/chat
// @access Private
exports.accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'UserId is required' });
  }

  try {
    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user._id, userId] }, // Simpler condition
    })
      .populate('users', '-password')
      .populate('latestMessage');

    if (chat) {
      return res.status(200).json(chat);
    }

    // Create a new chat
    const otherUser = await User.findById(userId); // Fetch other user's name
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const chatData = {
      chatName: otherUser.name, // Set chatName at creation
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const fullChat = await Chat.create(chatData);
    await fullChat.populate('users', '-password'); // Populate in one step

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



// @desc Fetch all chats for the logged-in user
// @route GET /api/chat
// @access Private
exports.fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({ users: req.user._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Delete chat messages for the current user only
// @route DELETE /api/chat/delete-messages
// @access Private
exports.deleteMessagesForUser = async (req, res) => {
  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ message: 'Chat ID is required' });
  }

  try {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { deletedForUsers: req.user._id } }, // Prevents duplicate entries
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json({ message: 'Chat deleted for this user only' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc Create a group chat
// @route POST /api/chat/group
// @access Private
exports.createGroupChat = async (req, res) => {
  const { users, chatName } = req.body;

  if (!users || !chatName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const parsedUsers = JSON.parse(users);

    if (parsedUsers.length < 2) {
      return res.status(400).json({ message: 'A group chat must have at least 2 users' });
    }

    parsedUsers.push(req.user._id); // Include the creator

    const groupChat = await Chat.create({
      chatName,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
// @desc Rename a group chat
// @route PUT /api/chat/group/rename
// @access Private
exports.renameGroupChat = async (req, res) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Add a user to a group chat
// @route PUT /api/chat/group/add
// @access Private
exports.addToGroupChat = async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Update chat by adding the user only if they are not already in the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $addToSet: { users: userId } }, // Prevents duplicate entries
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc Remove a user from a group chat
// @route PUT /api/chat/group/remove
// @access Private
exports.removeFromGroupChat = async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if the user being removed is the admin
    const isAdminLeaving = String(chat.groupAdmin) === String(userId);

    // Remove the user from the group
    chat.users = chat.users.filter((user) => String(user) !== String(userId));

    // If the admin is leaving, assign a new admin
    if (isAdminLeaving) {
      if (chat.users.length > 0) {
        // Automatically transfer admin rights to the first user in the group
        chat.groupAdmin = chat.users[0];
      } else {
        // If no users are left, clear the group admin
        chat.groupAdmin = null;
      }
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


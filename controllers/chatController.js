const Chat = require('../models/chatModel');
const User = require('../models/userModel');

// @desc Create or fetch a one-to-one chat
// @route POST /api/chat
// @access Private
exports.accessChat = async (req, res) => {
  const { userId } = req.body; // The selected contact's user ID

  if (!userId) {
    return res.status(400).json({ message: 'UserId is required' });
  }

  try {
    // Check if a chat already exists between the users
    let chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage')

    if (chat) {
      return res.status(200).json(chat); // Return the existing chat
    }

     // If a chat exists, update its chatName dynamically
     if (chat) {
      const otherUser = chat.users.find(
        (u) => u._id.toString() !== req.user._id.toString()
      );
      if (otherUser) {
        chat.chatName = otherUser.name;
        await chat.save();
      }
      return res.status(200).json(chat);
    }


    // Create a new chat if it doesn't exist
    const chatData = {
      chatName: 'sender',
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    const createdChat = await Chat.create(chatData);

    // Populate the created chat
    const fullChat = await Chat.findById(createdChat._id).populate(
      'users',
      '-password'
    );

      // Update the chatName dynamically for the newly created chat
    const otherUser = fullChat.users.find(
      (u) => u._id.toString() !== req.user._id.toString()
    );
    if (otherUser) {
      fullChat.chatName = otherUser.name;
      await fullChat.save();
    }

    res.status(201).json(fullChat); // Return the newly created chat
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// @desc Fetch all chats for the logged-in user
// @route GET /api/chat
// @access Private
exports.fetchChats = async (req, res) => {
  try {
    const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json(chats);
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

  const parsedUsers = JSON.parse(users);

  if (parsedUsers.length < 2) {
    return res.status(400).json({ message: 'A group chat must have at least 2 users' });
  }

  parsedUsers.push(req.user._id);

  try {
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
    // Find the chat to check if the user is already in the group
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if the user already exists in the users array
    if (chat.users.includes(userId)) {
      return res.status(400).json({ message: 'User is already in the group' });
    }

    // Add the user to the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

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


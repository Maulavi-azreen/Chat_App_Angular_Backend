const File = require('../models/fileModel');

// @desc Upload a file
// @route POST /api/files
// @access Private
exports.uploadFile = async (req, res) => {
  const { name, fileType, url, chatId } = req.body;

  if (!name || !fileType || !url || !chatId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const newFile = await File.create({
      name,
      fileType,
      url,
      uploadedBy: req.user._id,
      chat: chatId,
    });

    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Get all files of a chat
// @route GET /api/files/:chatId
// @access Private
exports.getFiles = async (req, res) => {
  const { chatId } = req.params;

  try {
    const files = await File.find({ chat: chatId }).populate('uploadedBy', 'name email profilePic');

    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

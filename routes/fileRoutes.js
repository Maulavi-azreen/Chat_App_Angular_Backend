const express = require('express');
const { uploadFile, getFiles } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, uploadFile); // Upload a file
router.get('/:chatId', protect, getFiles); // Get all files of a chat

module.exports = router;

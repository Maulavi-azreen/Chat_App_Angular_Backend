const express = require('express');
const { sendMessage, getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const io = require('../sockets/socketHandler'); 

const router = express.Router();

router.post('/', protect, sendMessage(io)); // Send a message
router.get('/:chatId', protect, getMessages); // Get all messages of a chat

module.exports = router;

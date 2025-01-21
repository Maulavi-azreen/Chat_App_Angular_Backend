const express = require('express');
const { 
    sendMessage, 
    getMessages, 
    markAsRead,
    deleteMessage,
    editMessage, 
    replyToMessage, 
    reactToMessage, 
    pinMessage, 
    unpinMessage, 
    searchMessages, 
    exportChatHistory, 
    muteChat, 
    unmuteChat  } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage); // Send a message
router.get('/:chatId', protect, getMessages); // Get all messages of a chat
router.put('/read/:messageId', protect, markAsRead); // Mark message as read
router.delete('/delete/:chatId/:messageId', protect, deleteMessage);
router.put('/edit/:messageId', protect, editMessage);
router.post('/reply/:messageId', protect, replyToMessage);
router.post('/react/:messageId', protect, reactToMessage);
router.put('/pin/:messageId', protect, pinMessage);
router.put('/unpin/:messageId', protect, unpinMessage);
router.get('/search/:chatId', protect, searchMessages);
router.get('/export/:chatId', protect, exportChatHistory);
router.put('/mute/:chatId', protect, muteChat);
router.put('/unmute/:chatId', protect, unmuteChat);

module.exports = router;

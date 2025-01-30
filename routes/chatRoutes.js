const express = require('express');
const {
  accessChat,
  fetchChats,
  deleteMessagesForUser ,
  createGroupChat,
  renameChat,
  addToGroupChat,
  removeFromGroupChat,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, accessChat); // One-to-one chat
router.get('/fetch-chats', protect, fetchChats); // Fetch all user chats
router.delete('/user/delete/message/:chatId', protect, deleteMessagesForUser); //delete chats
router.post('/group', protect, createGroupChat); // Create group chat
router.put('/rename', protect, renameChat); // Rename group chat
router.put('/group/add', protect, addToGroupChat); // Add user to group chat
router.put('/group/remove', protect, removeFromGroupChat); // Remove user from group chat

module.exports = router;

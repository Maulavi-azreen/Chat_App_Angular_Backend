const express = require('express');
const {
  getNotifications,
  markAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications); // Get all notifications
router.put('/:id', protect, markAsRead); // Mark notification as read

module.exports = router;

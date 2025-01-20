const Notification = require('../models/notificationModel');

// @desc Get all notifications for the logged-in user
// @route GET /api/notifications
// @access Private
exports.getNotifications = async (req, res) => {
  const { page = 1, limit = 10, isRead } = req.query; // Pagination and filtering

  try {
    const query = { user: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      notifications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc Mark one or multiple notifications as read
// @route PUT /api/notifications/:id
// @route PUT /api/notifications/mark-read (for bulk updates)
// @access Private
exports.markAsRead = async (req, res) => {
  const { id } = req.params; // Single notification update
  const { notificationIds } = req.body; // Bulk update

  try {
    let updatedNotifications;

    if (id) {
      // Update a single notification
      const notification = await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      updatedNotifications = [notification];
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Bulk update notifications
      updatedNotifications = await Notification.updateMany(
        { _id: { $in: notificationIds }, user: req.user._id },
        { isRead: true },
        { new: true }
      );

      if (!updatedNotifications) {
        return res.status(404).json({ message: 'No notifications found for update' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid request format' });
    }

    // Emit socket event to notify the user of the updates (optional)
    const userSocketId = req.app.get('onlineUsers').get(req.user._id);
    if (userSocketId) {
      req.app.get('io').to(userSocketId).emit('notificationsUpdated', updatedNotifications);
    }

    res.status(200).json({ message: 'Notifications updated', updatedNotifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

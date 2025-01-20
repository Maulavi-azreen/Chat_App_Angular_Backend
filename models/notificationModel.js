const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    link: { type: String }, // Optional link for navigation
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);

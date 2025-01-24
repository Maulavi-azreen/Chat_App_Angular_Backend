const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: 'default.png' },
    otp: { type: String, default: null }, // OTP for password reset
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

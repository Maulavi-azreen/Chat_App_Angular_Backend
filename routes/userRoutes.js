// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAllUsers,resetPassword,otpGenerate,verifyOTP } = require('../controllers/userController');

router.get('/getAllUsers',protect, getAllUsers); // Route to fetch all users
router.post('/otp-generate', otpGenerate); // Route to generate OTP
router.post('/verify-otp', verifyOTP); // Route to Verify OTP
router.post('/reset-password', resetPassword); // Route to Reset Password


module.exports = router;

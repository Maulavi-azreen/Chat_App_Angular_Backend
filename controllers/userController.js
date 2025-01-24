// userController.js
const User = require('../models/userModel'); // Assuming you have a User model
const { sendEmail,generateOTPEmail}=require('../service/emailService')
const bcrypt = require('bcryptjs');


const otpGenerator = require("otp-generator");


// Reset password                        
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: "User not found." });
    }

    // Check if the new password meets the minimum length requirement
    if (newPassword.length < 5) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 5 characters long.",
      });
    }

    // Generate a salt and hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the user's password
    user.password = hashedPassword;
    user.otp = null; // Clear OTP after successful password reset
    await user.save();

    // Password reset successful
    return res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      error: "An error occurred. Please try again later.",
    });
  }
};

// Generate OTP                       
// Generate OTP
exports.otpGenerate = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email and select the name field
    const user = await User.findOne({ email }).select("name");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const name = user.name;

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCase: false,
      specialChars: false,
      digits: true,
      alphabets: false,
    });

    // Update user's record with the OTP and save it
    user.otp = otp;
    await user.save();

    // Generate OTP email content
    const otpEmailContent = generateOTPEmail(otp);

    // Send OTP to the user's email
    await sendEmail(email, 'Password Reset OTP', otpEmailContent); // Pass email, subject, and content

    // Send response to the user
    res.status(201).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "An error occurred while sending OTP" });
  }
};
// Verify OTP                          
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user by email in the database
    const user = await User.findOne({ email });

    // If user not found, return error
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if OTP matches
    if (!user.otp || user.otp.trim() !== otp.trim()) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Clear the OTP from the user's record
    user.otp = null; // Assuming you have a field to store the OTP in your User model
    await user.save();

    // Respond with success message
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while verifying OTP" });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users from the database
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

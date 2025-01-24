const crypto = require('crypto');
const { sendEmail } = require('./emailService');  // Assuming sendEmail function is already defined

// Function to generate a random OTP (6-digit number)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Function to send OTP to the user email
const sendOTP = async (email, otp) => {
  const subject = "Password Reset OTP";
  const text = `Your OTP for resetting your password is: ${otp}. This OTP will expire in 10 minutes.`;

  try {
    await sendEmail(email, subject, text);
    console.log("OTP sent successfully");
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw new Error("Failed to send OTP");
  }
};

module.exports = { generateOTP, sendOTP };

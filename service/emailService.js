const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
    try {
        // Check if 'to' is defined and not empty
        if (!to || to.trim() === "") {
          throw new Error("No recipients defined");
        }
        console.log("Sending email to:", to); // Log the recipient email
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',  // Gmail's SMTP host
        port: 587,  // Use port 587 for TLS
        secure: false,  // TLS requires `secure: false`
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // App Password
      },
      tls: {
        rejectUnauthorized: false,  // Optional: to allow self-signed certificates (for debugging)
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender's email
      to, // Recipient's email
      subject, // Subject of the email
      html, // Body of the email
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Failed to send email"); // Re-throw the error for further handling
  }
};

// Generate a simple HTML email template
const generateWelcomeEmail = (name) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="text-align: center; color: #4CAF50;">Welcome to Our App, ${name}!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up for <strong>ChatMate</strong>. We're excited to have you on board!</p>
        <p>If you have any questions or need assistance, feel free to reply to this email.</p>
        <p>Best regards,</p>
        <p>The ChatMate Team</p>
        <footer style="margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
          <p>© ${new Date().getFullYear()} ChatMate. All rights reserved.</p>
        </footer>
      </div>
    `;
  };

  // Generate OTP email template
const generateOTPEmail = (otp) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="text-align: center; color: #4CAF50;">Password Reset OTP</h2>
        <p>We received a request to reset your password. Use the following OTP to proceed:</p>
        <h3 style="text-align: center; color: #4CAF50;">${otp}</h3>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The ChatMate Team</p>
        <footer style="margin-top: 20px; text-align: center; font-size: 12px; color: #aaa;">
          <p>© ${new Date().getFullYear()} ChatMate. All rights reserved.</p>
        </footer>
      </div>
    `;
  };

// Export functions for reuse
module.exports = {
  sendEmail,generateWelcomeEmail,generateOTPEmail
};

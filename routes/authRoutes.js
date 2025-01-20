const express = require("express");
const { registerUser, loginUser,getUserProfile } = require("../controllers/authController");
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
// Private route (requires authentication)
router.get('/profile', protect, getUserProfile);

module.exports = router;

// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/userController');

router.get('/getAllUsers', getAllUsers); // Route to fetch all users

module.exports = router;

const express = require('express');
const { login, register, updateProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
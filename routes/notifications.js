const express = require('express');
const { addNotification } = require('../controllers/notificationsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// TEMPORARY: Remove authMiddleware for testing - REMEMBER TO ADD IT BACK IN PRODUCTION!
router.post('/', /* authMiddleware, */ addNotification);

module.exports = router; 
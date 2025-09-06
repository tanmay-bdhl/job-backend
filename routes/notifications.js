const express = require('express');
const { addNotification } = require('../controllers/notificationsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

router.post('/', addNotification);

module.exports = router; 
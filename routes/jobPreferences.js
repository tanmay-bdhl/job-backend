const express = require('express');
const { jobPreferences, getJobPreferences } = require('../controllers/jobPreferencesController');
const { authMiddleware } = require('../utils/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware, jobPreferences);
router.get('/', authMiddleware, getJobPreferences);

module.exports = router; 
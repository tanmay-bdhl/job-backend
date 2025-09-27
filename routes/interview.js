const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/authMiddleware');
const { createConditionalQuestionRefreshRateLimit } = require('../middleware/rateLimiter');
const interviewController = require('../controllers/interviewController');

// Optional authentication middleware - allows both authenticated and unauthenticated access
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    authMiddleware(req, res, next);
  } else {
    req.user = null;
    next();
  }
};

// GET /api/analysis/{analysisId}/interview-questions
router.get('/:analysisId/interview-questions', optionalAuth, createConditionalQuestionRefreshRateLimit(), interviewController.getInterviewQuestions);

// POST /api/analysis/{analysisId}/questions/{questionId}/answer
router.post('/:analysisId/questions/:questionId/answer', optionalAuth, interviewController.submitAnswer);

// Bonus endpoints for better functionality
// GET /api/analysis/{analysisId}/questions/{questionId}/answer
router.get('/:analysisId/questions/:questionId/answer', optionalAuth, interviewController.getAnswer);

// GET /api/analysis/{analysisId}/answers
router.get('/:analysisId/answers', optionalAuth, interviewController.getAllAnswers);

module.exports = router;

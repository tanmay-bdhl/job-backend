const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/authMiddleware');
const { upload } = require('../services/analysisUploadService');
const analysisController = require('../controllers/analysisController');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    authMiddleware(req, res, next);
  } else {
    req.user = null;
    next();
  }
};

router.post('/upload', 
  optionalAuth,
  upload.single('resume'),
  analysisController.uploadResume
);

router.get('/user/history', authMiddleware, analysisController.getUserAnalyses);
router.get('/:analysisId/status', analysisController.getAnalysisStatus);

router.get('/:analysisId/results', analysisController.getAnalysisResults);

router.post('/:analysisId/cancel', analysisController.cancelAnalysis);
module.exports = router;

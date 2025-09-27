const express = require('express');
const router = express.Router();
const { getRateLimitStatus, getDeviceId } = require('../middleware/rateLimiter');

/**
 * GET /api/rate-limit/status
 * Get current rate limit status for a device
 * 
 * Query parameters:
 * - limitType: 'cv_upload' or 'question_refresh'
 * - analysisId: required for question_refresh type
 */
router.get('/status', async (req, res) => {
  try {
    const { limitType, analysisId } = req.query;
    
    if (!limitType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: limitType',
        validTypes: ['cv_upload', 'question_refresh']
      });
    }
    
    if (limitType === 'question_refresh' && !analysisId) {
      return res.status(400).json({
        success: false,
        error: 'analysisId is required for question_refresh rate limit status'
      });
    }
    
    const deviceId = getDeviceId(req);
    const status = await getRateLimitStatus(deviceId, limitType, analysisId);
    
    res.json({
      success: true,
      data: {
        deviceId: deviceId.substring(0, 20) + '...', // Truncate for privacy
        ...status
      }
    });
    
  } catch (error) {
    console.error('[RATE_LIMIT][STATUS_ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      message: error.message
    });
  }
});

/**
 * GET /api/rate-limit/info
 * Get rate limit configuration information
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      limits: {
        cv_upload: {
          limit: 6,
          window: '24 hours',
          description: 'Maximum CV uploads per device per day'
        },
        question_refresh: {
          limit: 2,
          window: '24 hours',
          description: 'Maximum question refreshes per CV per day'
        }
      },
      headers: {
        'X-RateLimit-Limit': 'Maximum number of requests allowed',
        'X-RateLimit-Remaining': 'Number of requests remaining',
        'X-RateLimit-Reset': 'ISO timestamp when rate limit resets',
        'X-RateLimit-Reset-Timestamp': 'Unix timestamp when rate limit resets',
        'Retry-After': 'Seconds to wait before retrying (only when rate limited)'
      },
      deviceIdentification: 'Combination of device fingerprint and IP address'
    }
  });
});

module.exports = router;

const redis = require('../config/redis');

/**
 * Rate Limiting Middleware with Sliding Window Algorithm
 * 
 * Supports:
 * - CV Upload: 6 per device per day
 * - Question Refresh: 2 per CV per day
 * 
 * Uses Redis with sliding window for accurate rate limiting
 */

const RATE_LIMITS = {
  CV_UPLOAD: {
    limit: 6,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: 'cv_upload',
    errorMessage: 'CV upload limit exceeded. Maximum 6 uploads per device per day.'
  },
  QUESTION_REFRESH: {
    limit: 2,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: 'question_refresh',
    errorMessage: 'Question refresh limit exceeded. Maximum 2 refreshes per CV per day.'
  }
};

/**
 * Generate device fingerprint from request
 * Combines device fingerprint header with IP for unique identification
 */
function getDeviceId(req) {
  const deviceFingerprint = req.headers['x-device-fingerprint'] || 
                           req.headers['device-fingerprint'] || 
                           'unknown';
  const clientIp = req.ip || 
                   req.connection.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   'unknown';
  
  return `${deviceFingerprint}:${clientIp}`;
}

/**
 * Generate Redis key for rate limiting
 */
function generateRateLimitKey(deviceId, limitType, analysisId = null) {
  const baseKey = `rate_limit:${deviceId}:${limitType}`;
  return analysisId ? `${baseKey}:${analysisId}` : baseKey;
}

/**
 * Sliding window rate limiter using Redis sorted sets
 * More accurate than fixed window as it counts requests in the last N milliseconds
 */
async function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Start Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove expired entries (older than window)
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request timestamp
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration for cleanup (slightly longer than window)
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 60);
    
    const results = await pipeline.exec();
    
    // Extract count from results (index 1 is zcard result)
    const currentCount = results[1][1];
    
    const isAllowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - (isAllowed ? 1 : 0));
    
    // Calculate reset time (when oldest request in window expires)
    let resetTime = now + windowMs;
    if (currentCount > 0) {
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      if (oldestEntry.length > 0) {
        resetTime = parseInt(oldestEntry[1]) + windowMs;
      }
    }
    
    return {
      allowed: isAllowed,
      limit,
      remaining,
      resetTime,
      retryAfter: isAllowed ? null : Math.ceil((resetTime - now) / 1000)
    };
    
  } catch (error) {
    console.error('[RATE_LIMITER][REDIS_ERROR]', error.message);
    // On Redis error, allow the request but log the issue
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime: now + windowMs,
      retryAfter: null,
      error: true
    };
  }
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(res, rateLimitResult) {
  res.set({
    'X-RateLimit-Limit': rateLimitResult.limit,
    'X-RateLimit-Remaining': rateLimitResult.remaining,
    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
    'X-RateLimit-Reset-Timestamp': Math.ceil(rateLimitResult.resetTime / 1000)
  });
  
  if (rateLimitResult.retryAfter) {
    res.set('Retry-After', rateLimitResult.retryAfter);
  }
}

/**
 * Log rate limit attempt for monitoring
 */
function logRateLimit(req, limitType, result, analysisId = null) {
  const deviceId = getDeviceId(req);
  const logData = {
    timestamp: new Date().toISOString(),
    deviceId: deviceId.substring(0, 20) + '...', // Truncate for privacy
    limitType,
    analysisId,
    allowed: result.allowed,
    remaining: result.remaining,
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    endpoint: `${req.method} ${req.originalUrl}`
  };
  
  if (result.allowed) {
    console.log('[RATE_LIMIT][ALLOWED]', JSON.stringify(logData));
  } else {
    console.warn('[RATE_LIMIT][BLOCKED]', JSON.stringify(logData));
  }
}

/**
 * Create rate limiting middleware for CV uploads
 */
function createCvUploadRateLimit() {
  return async (req, res, next) => {
    const limitConfig = RATE_LIMITS.CV_UPLOAD;
    const deviceId = getDeviceId(req);
    const key = generateRateLimitKey(deviceId, limitConfig.keyPrefix);
    
    try {
      const result = await checkRateLimit(key, limitConfig.limit, limitConfig.windowMs);
      
      // Add rate limit headers
      addRateLimitHeaders(res, result);
      
      // Log the attempt
      logRateLimit(req, 'cv_upload', result);
      
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          message: limitConfig.errorMessage,
          retryAfter: result.retryAfter,
          limitType: "cv_upload",
          limit: result.limit,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error('[RATE_LIMITER][CV_UPLOAD][ERROR]', error.message);
      // On error, allow request but log it
      next();
    }
  };
}


/**
 * Middleware to only apply rate limiting when refresh=true
 */
function createConditionalQuestionRefreshRateLimit() {
  return async (req, res, next) => {
    const refresh = req.query.refresh;
    
    // Only apply rate limiting when refresh=true
    if (refresh !== 'true') {
      return next();
    }
    
    const limitConfig = RATE_LIMITS.QUESTION_REFRESH;
    const deviceId = getDeviceId(req);
    const analysisId = req.params.analysisId;
    const key = generateRateLimitKey(deviceId, limitConfig.keyPrefix, analysisId);
    
    try {
      const result = await checkRateLimit(key, limitConfig.limit, limitConfig.windowMs);
      
      // Add rate limit headers
      addRateLimitHeaders(res, result);
      
      // Log the attempt
      logRateLimit(req, 'question_refresh', result, analysisId);
      
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          message: limitConfig.errorMessage,
          retryAfter: result.retryAfter,
          limitType: "question_refresh",
          limit: result.limit,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString(),
          analysisId
        });
      }
      
      next();
    } catch (error) {
      console.error('[RATE_LIMITER][QUESTION_REFRESH][ERROR]', error.message);
      // On error, allow request but log it
      next();
    }
  };
}

/**
 * Get current rate limit status for a device
 */
async function getRateLimitStatus(deviceId, limitType, analysisId = null) {
  const config = RATE_LIMITS[limitType.toUpperCase()];
  if (!config) {
    throw new Error(`Unknown limit type: ${limitType}`);
  }
  
  const key = generateRateLimitKey(deviceId, config.keyPrefix, analysisId);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Clean up expired entries and count current requests
    await redis.zremrangebyscore(key, 0, windowStart);
    const currentCount = await redis.zcard(key);
    
    // Get reset time
    let resetTime = now + config.windowMs;
    if (currentCount > 0) {
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES');
      if (oldestEntry.length > 0) {
        resetTime = parseInt(oldestEntry[1]) + config.windowMs;
      }
    }
    
    return {
      limitType,
      limit: config.limit,
      used: currentCount,
      remaining: Math.max(0, config.limit - currentCount),
      resetTime: new Date(resetTime).toISOString(),
      windowMs: config.windowMs
    };
  } catch (error) {
    console.error('[RATE_LIMITER][STATUS_ERROR]', error.message);
    return {
      limitType,
      limit: config.limit,
      used: 0,
      remaining: config.limit,
      resetTime: new Date(now + config.windowMs).toISOString(),
      windowMs: config.windowMs,
      error: 'Unable to fetch rate limit status'
    };
  }
}

module.exports = {
  createCvUploadRateLimit,
  createConditionalQuestionRefreshRateLimit,
  getRateLimitStatus,
  getDeviceId,
  RATE_LIMITS
};

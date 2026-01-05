const RateLimit = require('../models/RateLimit');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Rate limiter middleware
 * Enforces rate limits per workspace based on subscription tier
 */
async function rateLimiterMiddleware(req, res, next) {
  if (!req.workspace) {
    return next();
  }

  try {
    // Get current minute window
    const windowStart = new Date();
    windowStart.setSeconds(0, 0);

    // Get current count
    const currentCount = await RateLimit.getCount(req.workspace.id, windowStart);

    // Check limit
    if (currentCount >= req.workspace.rate_limit_per_minute) {
      const resetAt = new Date(windowStart.getTime() + 60000);
      
      res.setHeader('X-RateLimit-Limit', req.workspace.rate_limit_per_minute);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', resetAt.toISOString());
      
      return response.error(res, 'Rate limit exceeded', 429);
    }

    // Increment counter
    await RateLimit.increment(req.workspace.id, windowStart);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', req.workspace.rate_limit_per_minute);
    res.setHeader('X-RateLimit-Remaining', req.workspace.rate_limit_per_minute - currentCount - 1);
    res.setHeader('X-RateLimit-Reset', new Date(windowStart.getTime() + 60000).toISOString());
    
    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    // On error, allow request through (fail open)
    next();
  }
}

module.exports = rateLimiterMiddleware;


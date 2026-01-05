const response = require('../utils/response');

// Simple in-memory rate limiter for auth routes
// Maps IP -> { count, resetTime }
const rateLimitStore = new Map();

/**
 * Simple rate limiter middleware for authentication routes
 * Prevents brute force attacks on login/callback endpoints
 */
function authRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 5 // 5 attempts per window
  } = options;

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    const limitData = rateLimitStore.get(ip);
    
    if (!limitData || limitData.resetTime < now) {
      // First request or window expired - reset
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    // Check if limit exceeded
    if (limitData.count >= maxRequests) {
      const resetIn = Math.ceil((limitData.resetTime - now) / 1000);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
      
      return response.error(res, 'Too many authentication attempts. Please try again later.', 429);
    }
    
    // Increment count
    limitData.count++;
    rateLimitStore.set(ip, limitData);
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - limitData.count);
    res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime).toISOString());
    
    next();
  };
}

module.exports = authRateLimiter;


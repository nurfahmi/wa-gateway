const logger = require('./logger');
const { getRedisClient } = require('./redis');

// Cache TTL: 5 minutes (tokens are typically valid for longer, but we refresh cache frequently)
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Get cached token introspection result
 */
async function getCachedToken(token) {
  try {
    const client = getRedisClient();
    if (!client) {
      return null; // Redis unavailable - cache miss
    }
    const cacheKey = `token:${token.substring(0, 20)}`; // Use first 20 chars as key
    const cached = await client.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    // If Redis fails, don't break the flow - just return null (cache miss)
    // Only log if it's an unexpected error (not connection refused)
    if (error.code !== 'ECONNREFUSED') {
      logger.debug('Token cache get failed:', error.message);
    }
    return null;
  }
}

/**
 * Cache token introspection result
 */
async function setCachedToken(token, data) {
  try {
    const client = getRedisClient();
    if (!client) {
      return; // Redis unavailable - skip caching
    }
    const cacheKey = `token:${token.substring(0, 20)}`;
    await client.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    // If Redis fails, don't break the flow - silently skip caching
    // Only log if it's an unexpected error (not connection refused)
    if (error.code !== 'ECONNREFUSED') {
      logger.debug('Token cache set failed:', error.message);
    }
  }
}

/**
 * Invalidate cached token (on logout, token refresh, etc.)
 */
async function invalidateToken(token) {
  try {
    const client = getRedisClient();
    if (!client) {
      return; // Redis unavailable - nothing to invalidate
    }
    const cacheKey = `token:${token.substring(0, 20)}`;
    await client.del(cacheKey);
  } catch (error) {
    // Silently fail - Redis may be unavailable
    if (error.code !== 'ECONNREFUSED') {
      logger.debug('Token cache invalidation failed:', error.message);
    }
  }
}

/**
 * Clear all token caches (for testing/debugging)
 */
async function clearAllTokens() {
  try {
    const client = getRedisClient();
    const keys = await client.keys('token:*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
    logger.info(`Cleared ${keys.length} token cache entries`);
  } catch (error) {
    logger.warn('Token cache clear failed:', error.message);
  }
}

module.exports = {
  getCachedToken,
  setCachedToken,
  invalidateToken,
  clearAllTokens,
  CACHE_TTL
};


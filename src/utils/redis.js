const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redisClient = null;
let redisAvailable = false;
let redisInitialized = false;

/**
 * Get or create Redis client (lazy initialization)
 * Returns null if Redis is unavailable
 */
function getRedisClient() {
  // Only initialize once
  if (!redisInitialized) {
    redisInitialized = true;
    
    try {
      redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryStrategy: (times) => {
          // Stop retrying after 5 attempts (about 10 seconds)
          if (times > 5) {
            logger.warn('⚠️  Redis connection failed after multiple retries. Continuing without Redis.');
            redisAvailable = false;
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1, // Fail fast for requests
        enableReadyCheck: true,
        enableOfflineQueue: false,
        lazyConnect: true, // Don't connect immediately
        connectTimeout: 5000, // 5 second timeout
        // Suppress connection errors - we'll handle them gracefully
        showFriendlyErrorStack: false
      });

      redisClient.on('error', (err) => {
        // Only log if we thought Redis was available
        if (redisAvailable) {
          logger.warn('⚠️  Redis error (continuing without Redis):', err.message || err.code);
        }
        redisAvailable = false;
      });

      redisClient.on('connect', () => {
        logger.info('✅ Redis client connecting...');
      });

      redisClient.on('ready', () => {
        logger.info('✅ Redis client ready');
        redisAvailable = true;
      });

      redisClient.on('close', () => {
        if (redisAvailable) {
          logger.warn('⚠️  Redis client connection closed');
        }
        redisAvailable = false;
      });

      // Try to connect (but don't wait)
      redisClient.connect().catch(() => {
        // Connection failed - that's okay, we'll use fallbacks
        redisAvailable = false;
      });
    } catch (error) {
      logger.warn('⚠️  Redis initialization failed (continuing without Redis):', error.message);
      redisAvailable = false;
      redisClient = null;
    }
  }

  // Return client only if available, otherwise null
  return redisAvailable ? redisClient : null;
}

/**
 * Test Redis connection
 */
async function testConnection() {
  try {
    const client = getRedisClient();
    if (!client) {
      return false;
    }
    await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    redisAvailable = true;
    return true;
  } catch (error) {
    redisAvailable = false;
    return false;
  }
}

/**
 * Check if Redis is available
 */
function isRedisAvailable() {
  return redisAvailable && redisClient !== null;
}

/**
 * Gracefully close Redis connection
 */
async function closeConnection() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

module.exports = {
  getRedisClient,
  testConnection,
  closeConnection,
  isRedisAvailable
};


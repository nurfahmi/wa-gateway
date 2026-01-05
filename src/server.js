const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const schedulerService = require('./services/schedulerService');
const { testConnection: testRedisConnection, closeConnection: closeRedisConnection } = require('./utils/redis');

const PORT = config.app.port;

// Test Redis connection on startup (non-blocking)
async function initializeServices() {
  // Test Redis connection (non-blocking - don't wait too long)
  setTimeout(async () => {
    try {
      const redisConnected = await Promise.race([
        testRedisConnection(),
        new Promise((resolve) => setTimeout(() => resolve(false), 2000)) // 2 second timeout
      ]);
      
      if (redisConnected) {
        logger.info('✅ Redis connection verified');
      } else {
        if (config.app.env === 'production') {
          logger.warn('⚠️  Redis connection failed - sessions will use memory store');
          logger.warn('⚠️  This is not recommended for production');
        } else {
          logger.info('ℹ️  Redis not available - using memory session store (OK for development)');
        }
      }
    } catch (error) {
      // Silently handle - Redis is optional
      if (config.app.env === 'production') {
        logger.warn('⚠️  Redis check failed:', error.message);
      }
    }
  }, 1000); // Wait 1 second for Redis to attempt connection
}

const server = app.listen(PORT, async () => {
  logger.info(`🚀 WhatsApp Gateway SaaS running on port ${PORT}`);
  logger.info(`📱 Environment: ${config.app.env}`);
  logger.info(`🔗 URL: ${config.app.url}`);
  
  // Initialize services
  await initializeServices();
  
  // Start scheduler for scheduled messages and broadcasts
  schedulerService.start();
  logger.info('📅 Message scheduler started');
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server...');
  
  // Stop scheduler
  schedulerService.stop();
  
  // Close Redis connection
  try {
    await closeRedisConnection();
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;


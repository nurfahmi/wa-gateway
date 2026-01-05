const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./middlewares/errorHandler');
const { getRedisClient, isRedisAvailable } = require('./utils/redis');

const app = express();

// Trust proxy (for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
const baileysServiceUrl = config.baileys.serviceUrl || 'http://localhost:3000/api/whatsapp';
// Extract base URL from Baileys service URL (e.g., http://localhost:3000 from http://localhost:3000/api/whatsapp)
const baileysBaseUrl = baileysServiceUrl.replace(/\/api\/whatsapp.*$/, '');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", baileysBaseUrl], // Allow images from Baileys service
      connectSrc: ["'self'", baileysBaseUrl] // Allow connections to Baileys service for file uploads
    }
  }
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// XSS protection
app.use(xss());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session with Redis store (fallback to memory store if Redis unavailable)
let sessionStore;
try {
  const redisClient = getRedisClient();
  if (redisClient) {
    // Create RedisStore - it will handle connection errors gracefully
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'wa-gateway:sess:',
      // Handle errors gracefully
      disableTouch: false
    });
    
    // Log status asynchronously after connection attempt
    setTimeout(() => {
      if (isRedisAvailable()) {
        logger.info('✅ Using Redis session store');
      } else {
        logger.warn('⚠️  Redis unavailable - session store will use memory fallback');
        logger.warn('⚠️  Sessions will be lost on server restart');
        logger.warn('⚠️  To enable Redis: ensure Redis is running and REDIS_HOST/REDIS_PORT are set');
      }
    }, 500);
  } else {
    logger.warn('⚠️  Redis client not available - using memory session store');
    sessionStore = undefined; // Use default memory store
  }
} catch (error) {
  logger.warn('⚠️  Redis session store initialization failed, using memory store:', error.message);
  sessionStore = undefined; // Use default memory store
}

app.use(session({
  ...config.session,
  store: sessionStore // Will be undefined if Redis unavailable (uses memory store)
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global template variables
app.locals.productPageUrl = config.productPage?.url || null;

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
const apiAccountRoutes = require('./routes/api/accounts');
const apiMessageRoutes = require('./routes/api/messages');
const apiWebhookRoutes = require('./routes/api/webhooks');
const apiKeyRoutes = require('./routes/api/apiKeys');
const apiAutomationRoutes = require('./routes/api/automation');
const apiBusinessTemplateRoutes = require('./routes/api/businessTemplates');
const apiWarmerRoutes = require('./routes/api/warmer');
const apiProxyRoutes = require('./routes/api/proxy');
const webAuthRoutes = require('./routes/web/auth');
const webAuthDebugRoutes = require('./routes/web/auth-debug');
const webDashboardRoutes = require('./routes/web/dashboard');

// Dev routes (only in development)
if (config.app.env === 'development') {
  const devAuthRoutes = require('./routes/web/dev-auth');
  app.use('/', devAuthRoutes);
  logger.warn('⚠️  DEV AUTH ENABLED - Bypass OAuth at /dev-login');
}

// API routes with /api/whatsapp prefix to match API_CURL_COMMANDS.md documentation
app.use('/api/whatsapp', apiAccountRoutes); // Handles devices, sessions, users, files, server, ai, chat-settings
app.use('/api/whatsapp', apiMessageRoutes); // Handles send, messages
app.use('/api/whatsapp/webhooks', apiWebhookRoutes);
app.use('/api/whatsapp/keys', apiKeyRoutes);
app.use('/api/automation', apiAutomationRoutes); // Kept at /api/automation for internal use
app.use('/api/business-templates', apiBusinessTemplateRoutes); // Kept at /api/business-templates per doc
app.use('/api/warmer', apiWarmerRoutes); // Warmer system endpoints
app.use('/api', apiProxyRoutes); // Proxy to Baileys service (masks BAILEYS_SERVICE_URL)
app.use('/auth', webAuthRoutes);
app.use('/auth', webAuthDebugRoutes); // Debug endpoint at /auth/debug
app.use('/', webDashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;


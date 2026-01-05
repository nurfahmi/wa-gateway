require('dotenv').config();

/**
 * Validate required configuration on startup
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  // OAuth configuration (required in production)
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.AUTH_SERVER_URL) {
      errors.push('AUTH_SERVER_URL is required in production');
    }
    if (!process.env.OAUTH_CLIENT_ID) {
      errors.push('OAUTH_CLIENT_ID is required in production');
    }
    if (!process.env.OAUTH_CLIENT_SECRET) {
      errors.push('OAUTH_CLIENT_SECRET is required in production');
    }
    if (!process.env.OAUTH_REDIRECT_URI) {
      errors.push('OAUTH_REDIRECT_URI is required in production');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-secret') {
      errors.push('SESSION_SECRET must be changed from default in production');
    }
  } else {
    // Warnings in development
    if (!process.env.AUTH_SERVER_URL) {
      warnings.push('AUTH_SERVER_URL not set - OAuth will not work');
    }
    if (!process.env.OAUTH_CLIENT_ID) {
      warnings.push('OAUTH_CLIENT_ID not set - OAuth will not work');
    }
    if (!process.env.OAUTH_CLIENT_SECRET) {
      warnings.push('OAUTH_CLIENT_SECRET not set - OAuth will not work');
    }
    if (!process.env.OAUTH_REDIRECT_URI) {
      warnings.push('OAUTH_REDIRECT_URI not set - OAuth will not work');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-secret') {
      warnings.push('SESSION_SECRET is using default value - change in production');
    }
  }

  // Database configuration
  if (!process.env.DB_HOST) {
    errors.push('DB_HOST is required');
  }
  if (!process.env.DB_NAME) {
    errors.push('DB_NAME is required');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // Throw errors
  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('Invalid configuration. Please check your .env file.');
  }
}

// Validate on module load
validateConfig();

module.exports = {
  app: {
    name: 'WhatsApp Gateway SaaS',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    url: process.env.APP_URL || 'http://localhost:3000'
  },
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'whatsapp_gateway',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  },
  
  oauth: {
    serverUrl: process.env.AUTH_SERVER_URL,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log'
  },
  
  baileys: {
    serviceApiKey: process.env.BAILEYS_SERVICE_API_KEY || null,
    serviceUrl: process.env.BAILEYS_SERVICE_URL || 'http://localhost:3000/api/whatsapp',
    timeout: parseInt(process.env.BAILEYS_TIMEOUT, 10) || 10000, // 10 seconds default
    sendTimeout: parseInt(process.env.BAILEYS_SEND_TIMEOUT, 10) || 30000 // 30 seconds for send operations
  },
  
  ai: {
    // Primary AI Provider Configuration
    primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'openai', // openai, deepseek, claude, gemini, groq
    fallbackProvider: process.env.AI_FALLBACK_PROVIDER || '', // empty = no fallback
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4',
    defaultTemperature: parseFloat(process.env.AI_DEFAULT_TEMPERATURE) || 0.7,
    defaultMaxTokens: parseInt(process.env.AI_DEFAULT_MAX_TOKENS, 10) || 500,
    
    // API Keys for different providers
    openai: {
      apiKey: process.env.OPENAI_API_KEY || null
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || null
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || null
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || null
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || null
    }
  },
  
  // Legacy OpenAI config (for backward compatibility)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4',
    defaultTemperature: parseFloat(process.env.OPENAI_DEFAULT_TEMPERATURE) || 0.7,
    defaultMaxTokens: parseInt(process.env.OPENAI_DEFAULT_MAX_TOKENS, 10) || 500
  },
  
  subscriptionTiers: {
    free: {
      deviceLimit: 1,
      rateLimitPerMinute: 30,
      messageRetentionDays: 7,
      webhookEnabled: false
    },
    starter: {
      deviceLimit: 3,
      rateLimitPerMinute: 60,
      messageRetentionDays: 30,
      webhookEnabled: true
    },
    professional: {
      deviceLimit: 10,
      rateLimitPerMinute: 120,
      messageRetentionDays: 90,
      webhookEnabled: true
    },
    enterprise: {
      deviceLimit: 50,
      rateLimitPerMinute: 300,
      messageRetentionDays: 365,
      webhookEnabled: true
    }
  },

  // Development
  dev: {
    apiKey: process.env.DEV_API_KEY || null
  },
  
  // Product/Store Page URL for buying more devices
  productPage: {
    url: process.env.PRODUCT_CO_PAGE || null
  },
  
  // WhatsApp Device Product Configuration
  // Used to filter which subscriptions count toward device limits
  whatsappDevice: {
    // Product names that identify WhatsApp Device subscriptions (case-insensitive)
    productNames: (process.env.WHATSAPP_DEVICE_PRODUCT_NAMES || 'WhatsApp Device,WA Device,WhatsApp Gateway Device')
      .split(',')
      .map(name => name.trim().toLowerCase()),

    // Product IDs that identify WhatsApp Device subscriptions (optional)
    productIds: process.env.WHATSAPP_DEVICE_PRODUCT_IDS
      ? process.env.WHATSAPP_DEVICE_PRODUCT_IDS.split(',').map(id => parseInt(id.trim()))
      : null,

    // Per device pricing
    perDevicePrice: parseFloat(process.env.PER_DEVICE_PRICE) || 15.0 // Default $15 per device
  }
};


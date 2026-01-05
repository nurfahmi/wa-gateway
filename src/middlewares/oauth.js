const oauthClient = require('../config/oauth');
const WorkspaceUser = require('../models/WorkspaceUser');
const Workspace = require('../models/Workspace');
const response = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');
const { getCachedToken, setCachedToken, invalidateToken } = require('../utils/tokenCache');

/**
 * OAuth token verification middleware
 * Validates OAuth access token and attaches user info to request
 */
async function oauthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.unauthorized(res, 'Missing or invalid authorization header');
  }
  
  let token = authHeader.substring(7); // Use let for token refresh capability
  
  // DEV MODE: Bypass OAuth for development tokens
  if (config.app.env === 'development' && token.startsWith('dev_token_')) {
    logger.warn('⚠️  Using dev token bypass - ONLY for development!');
    
    // Find user from session/database
    const WorkspaceUser = require('../models/WorkspaceUser');
    const workspaceUser = await WorkspaceUser.findByOAuthId('dev_user_123');
    
    if (workspaceUser) {
      req.user = {
        id: 'dev_user_123',
        email: 'dev@example.com',
        name: 'Development User',
        role: 'owner'
      };
      req.subscription = {
        tier: 'per_device',
        product_id: null,
        expired_at: null,
        device_limit: 50, // Dev mode: unlimited devices
        rate_limit: 1500
      };
      req.accessToken = token;
      return next();
    }
  }
  
  // Only log detailed info in debug mode (reduce log noise from polling)
  const isDebugMode = config.app.env === 'development' && process.env.LOG_LEVEL === 'debug';
  
  try {
    // Check cache first
    let result = await getCachedToken(token);
    
    if (result) {
      if (isDebugMode) {
        logger.debug('✅ Using cached token introspection result');
      }
    } else {
      // Cache miss - introspect token with membership system
      if (isDebugMode) {
        logger.info('🔐 OAuth Token Introspection Request', {
          tokenPrefix: token.substring(0, 10) + '...',
          timestamp: new Date().toISOString()
        });
      }
      
      result = await oauthClient.introspectToken(token);
      
      // Cache the result
      await setCachedToken(token, result);
    }
    
    // Log full OAuth response only in debug mode (reduce log noise)
    if (isDebugMode) {
      logger.info('📥 OAuth Introspect Response Received', {
        active: result.active,
        user: result.user ? {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name
        } : null,
        subscriptionsCount: result.subscriptions?.length || 0,
        subscriptions: result.subscriptions?.map(sub => ({
          product_id: sub.product_id,
          product_name: sub.product_name,
          device_limit: sub.device_limit || sub.metadata?.device_limit,
          rate_limit: sub.rate_limit_per_minute || sub.metadata?.rate_limit_per_minute,
          expired_at: sub.expired_at
        })) || []
      });
    }
    
    if (!result.active) {
      logger.warn('❌ Token is not active:', { token: token.substring(0, 10) + '...' });
      
      // Invalidate cache
      await invalidateToken(token);
      
      // Try to refresh token if we have refresh token in session (for web requests)
      if (req.session?.refreshToken) {
        try {
          logger.info('🔄 Attempting token refresh...');
          const newTokens = await oauthClient.refreshToken(req.session.refreshToken);
          
          if (newTokens.access_token) {
            // Update session with new tokens
            req.session.accessToken = newTokens.access_token;
            if (newTokens.refresh_token) {
              req.session.refreshToken = newTokens.refresh_token;
            }
            
            // Retry introspection with new token
            const newResult = await oauthClient.introspectToken(newTokens.access_token);
            await setCachedToken(newTokens.access_token, newResult);
            
            if (newResult.active) {
              logger.info('✅ Token refreshed successfully');
              // Update token in request for downstream use
              token = newTokens.access_token;
              result = newResult;
            } else {
              throw new Error('Refreshed token is not active');
            }
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch (refreshError) {
          logger.error('Token refresh failed:', refreshError.message);
          return response.unauthorized(res, 'Token expired. Please log in again.');
        }
      } else {
        // No refresh token available (API request)
        return response.unauthorized(res, 'Invalid or expired token');
      }
    }
    
    // Extract user info from token
    const userInfo = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name || result.user.email,
      role: result.user.role
    };
    
    // Only log user info in debug mode
    if (isDebugMode) {
      logger.info('👤 User Info Extracted', {
        userId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name
      });
    }

    // Extract subscription info - SUM only WhatsApp Device subscriptions
    let subscriptionInfo = { tier: 'per_device', product_id: null, expired_at: null, device_limit: 0, rate_limit: null };
    
    if (result.subscriptions && result.subscriptions.length > 0) {
      // Only log subscription processing in debug mode
      if (isDebugMode) {
        logger.info('📦 Processing Subscriptions', {
          totalSubscriptions: result.subscriptions.length,
          configuredProductNames: config.whatsappDevice.productNames,
          configuredProductIds: config.whatsappDevice.productIds || 'not configured'
        });
      }
      
      // Filter only WhatsApp Device subscriptions - STRICT: Only match configured names/IDs
      const whatsappDeviceSubs = result.subscriptions.filter(sub => {
        const productName = (sub.product_name || '').toLowerCase();
        const productId = sub.product_id;
        
        // Check if product name matches WhatsApp Device products (from .env)
        const nameMatches = config.whatsappDevice.productNames.some(name => 
          productName.includes(name)
        );
        
        // Check if product ID matches (if configured in .env)
        const idMatches = config.whatsappDevice.productIds 
          ? config.whatsappDevice.productIds.includes(productId)
          : false;
        
        // STRICT MODE: Only match if name OR ID matches (no fallback)
        const isMatch = nameMatches || idMatches;
        
        // Only log subscription filter checks in debug mode
        if (isDebugMode) {
          logger.debug('🔍 Subscription Filter Check', {
            product_id: productId,
            product_name: sub.product_name,
            device_limit: sub.device_limit || sub.metadata?.device_limit,
            nameMatches,
            idMatches,
            isMatch,
            reason: isMatch 
              ? (nameMatches ? 'name match' : 'id match')
              : 'no match - not in WHATSAPP_DEVICE_PRODUCT_NAMES or WHATSAPP_DEVICE_PRODUCT_IDS'
          });
        }
        
        return isMatch;
      });
      
      // Only log subscription filtering details in debug mode
      if (isDebugMode) {
        logger.info('✅ WhatsApp Device Subscriptions Filtered', {
          matched: whatsappDeviceSubs.length,
          ignored: result.subscriptions.length - whatsappDeviceSubs.length,
          matchedSubscriptions: whatsappDeviceSubs.map(sub => ({
            product_id: sub.product_id,
            product_name: sub.product_name,
            device_limit: sub.device_limit || sub.metadata?.device_limit
          }))
        });
      }
      
      // Sum device limits from WhatsApp Device subscriptions only
      let totalDeviceLimit = 0;
      let totalRateLimit = 0;
      let latestExpiry = null;
      
      whatsappDeviceSubs.forEach(sub => {
        const deviceLimit = sub.device_limit || sub.metadata?.device_limit || 0;
        const rateLimit = sub.rate_limit_per_minute || sub.metadata?.rate_limit_per_minute || 0;
        
        totalDeviceLimit += deviceLimit;
        totalRateLimit += rateLimit;
        
        // Track latest expiry date
        if (sub.expired_at) {
          const expiry = new Date(sub.expired_at);
          if (!latestExpiry || expiry > latestExpiry) {
            latestExpiry = expiry;
          }
        }
      });
      
      // If no WhatsApp Device subscriptions found, default to 1
      if (totalDeviceLimit === 0) {
        totalDeviceLimit = 1;
      }
      
      subscriptionInfo = {
        tier: 'per_device',
        product_id: whatsappDeviceSubs[0]?.product_id || null,
        expired_at: latestExpiry ? latestExpiry.toISOString() : null,
        device_limit: totalDeviceLimit,
        rate_limit: totalRateLimit > 0 ? totalRateLimit : null
      };
      
      // Only log subscription summary in debug mode (reduce log noise from polling)
      if (isDebugMode) {
        const otherProductsCount = result.subscriptions.length - whatsappDeviceSubs.length;
        logger.info('📊 Subscription Summary', {
          user: userInfo.email,
          whatsappDeviceSubscriptions: whatsappDeviceSubs.length,
          otherProductsIgnored: otherProductsCount,
          totalDevices: totalDeviceLimit,
          totalRateLimit: totalRateLimit || 'auto-calculated',
          subscriptionDetails: {
            tier: subscriptionInfo.tier,
            product_id: subscriptionInfo.product_id,
            device_limit: subscriptionInfo.device_limit,
            rate_limit: subscriptionInfo.rate_limit,
            expired_at: subscriptionInfo.expired_at
          }
        });
      }
    } else {
      // No subscriptions = free tier (1 device)
      subscriptionInfo.device_limit = 1;
      if (isDebugMode) {
        logger.info('🆓 No Subscriptions Found - Using Free Tier', {
          user: userInfo.email,
          device_limit: 1
        });
      }
    }

    // Attach to request
    req.user = userInfo;
    req.subscription = subscriptionInfo;
    req.accessToken = token;
    
    // Only log successful auth in debug mode (reduce log noise)
    if (isDebugMode) {
      logger.info('✅ OAuth Authentication Successful', {
        user: userInfo.email,
        device_limit: subscriptionInfo.device_limit
      });
    }
    
    next();
  } catch (error) {
    logger.error('OAuth validation error:', error);
    logger.error('Token introspection failed - Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return response.unauthorized(res, 'Token validation failed');
  }
}

/**
 * Workspace resolution middleware
 * Resolves workspace from authenticated user and creates if doesn't exist
 */
async function workspaceContextMiddleware(req, res, next) {
  // Check for various authentication methods
  if (!req.user && !req.apiKey && !req.deviceApiKey && !req.session?.user) {
    return response.unauthorized(res, 'Authentication required (Bearer token, X-API-Key, or session)');
  }

  try {
    let workspace;

    // Handle session-based authentication (for dashboard)
    if (req.session?.user && !req.user) {
      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      if (workspaceUser) {
        req.user = req.session.user;
        workspace = await Workspace.findById(workspaceUser.workspace_id);
        req.workspace = workspace;
        req.subscription = {
          tier: workspace.subscription_tier,
          device_limit: workspace.device_limit,
          rate_limit: workspace.rate_limit_per_minute
        };
        return next();
      }
    }

    if (req.user) {
      // OAuth flow - get or create workspace from user
      let workspaceUser = await WorkspaceUser.findByOAuthId(req.user.id);
      
      if (!workspaceUser) {
        // First-time user - create workspace and user
        logger.info(`Creating workspace for new user ${req.user.email}`);
        
        // Per-device pricing: use device count directly from subscription
        const deviceLimit = req.subscription?.device_limit || 1;
        const tier = req.subscription?.tier || 'per_device';
        
        // Calculate rate limit based on device count (30 requests per device per minute)
        const rateLimitPerMinute = req.subscription?.rate_limit || (deviceLimit * 30);
        
        workspace = await Workspace.create({
          name: `${req.user.name}'s Workspace`,
          subscription_tier: tier,
          device_limit: deviceLimit,
          rate_limit_per_minute: rateLimitPerMinute
        });
        
        workspaceUser = await WorkspaceUser.create({
          workspace_id: workspace.id,
          oauth_user_id: req.user.id,
          email: req.user.email,
          full_name: req.user.name,
          role: 'owner'
        });
      } else {
        // Existing user - get workspace
        workspace = await Workspace.findById(workspaceUser.workspace_id);
        
        // Note: Device limit sync is done on login (auth callback) only
        // Skip sync here to optimize API request performance
        // This avoids 2 extra DB operations on every request
      }
    } else if (req.apiKey) {
      // API key flow - get workspace from key
      workspace = await Workspace.findById(req.apiKey.workspace_id);
    } else if (req.deviceApiKey) {
      // Device API key flow - get workspace from device key
      workspace = await Workspace.findById(req.deviceApiKey.workspaceId);
    }

    if (!workspace) {
      return response.forbidden(res, 'Workspace not found');
    }

    if (!workspace.is_active) {
      return response.forbidden(res, 'Workspace is inactive');
    }

    // Attach workspace to request
    req.workspace = workspace;
    
    next();
  } catch (error) {
    logger.error('Workspace resolution error:', error);
    return response.error(res, 'Failed to resolve workspace', 500);
  }
}

module.exports = {
  oauthMiddleware,
  workspaceContextMiddleware
};


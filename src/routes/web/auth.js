const express = require('express');
const router = express.Router();
const oauthClient = require('../../config/oauth');
const WorkspaceUser = require('../../models/WorkspaceUser');
const Workspace = require('../../models/Workspace');
const config = require('../../config');
const logger = require('../../utils/logger');
const crypto = require('../../utils/crypto');
const authRateLimiter = require('../../middlewares/authRateLimiter');

// Rate limiting for auth routes (stricter than API routes)
// 5 attempts per 15 minutes per IP
const rateLimit = authRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 attempts per 15 minutes
});

/**
 * Initiate OAuth login
 */
router.get('/login', rateLimit, (req, res) => {
  try {
    // Validate OAuth configuration
    if (!config.oauth.serverUrl || !config.oauth.clientId || !config.oauth.redirectUri) {
      logger.error('OAuth configuration missing:', {
        hasServerUrl: !!config.oauth.serverUrl,
        hasClientId: !!config.oauth.clientId,
        hasRedirectUri: !!config.oauth.redirectUri
      });
      return res.redirect('/?error=oauth_not_configured');
    }

    const state = crypto.generateOAuthState();
    req.session.oauthState = state;
    
    const authUrl = oauthClient.getAuthorizationUrl(state);
    
    logger.info('🔐 Initiating OAuth login', {
      redirectUri: config.oauth.redirectUri,
      serverUrl: config.oauth.serverUrl,
      statePrefix: state.substring(0, 10) + '...'
    });
    
    res.redirect(authUrl);
  } catch (error) {
    logger.error('OAuth login initiation error:', error);
    res.redirect('/?error=login_failed');
  }
});

/**
 * OAuth callback handler
 */
router.get('/callback', rateLimit, async (req, res) => {
  const { code, state, error } = req.query;

  logger.info('📥 OAuth callback received', {
    hasCode: !!code,
    hasState: !!state,
    hasError: !!error,
    error: error || null,
    sessionState: req.session.oauthState ? req.session.oauthState.substring(0, 10) + '...' : 'missing'
  });

  // Handle OAuth error
  if (error) {
    logger.error('OAuth error from provider:', error);
    return res.redirect('/?error=auth_failed&reason=' + encodeURIComponent(error));
  }

  // Check for missing code
  if (!code) {
    logger.error('OAuth callback missing authorization code');
    return res.redirect('/?error=missing_code');
  }

  // Verify state (CSRF protection)
  if (!state) {
    logger.error('OAuth callback missing state parameter');
    return res.redirect('/?error=missing_state');
  }

  if (!req.session.oauthState) {
    logger.error('OAuth callback: session state missing (session may have expired)');
    return res.redirect('/?error=session_expired');
  }

  if (state !== req.session.oauthState) {
    logger.error('OAuth state mismatch', {
      receivedState: state.substring(0, 10) + '...',
      sessionState: req.session.oauthState.substring(0, 10) + '...'
    });
    return res.redirect('/?error=invalid_state');
  }

  try {
    logger.info('🔐 OAuth Login Flow Started', {
      code: code.substring(0, 10) + '...',
      state: state.substring(0, 10) + '...'
    });
    
    // Exchange code for tokens
    logger.info('🔄 Exchanging Authorization Code for Tokens');
    const tokens = await oauthClient.exchangeCode(code);
    
    logger.info('✅ Token Exchange Successful', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type
    });
    
    // Introspect token to get user info
    logger.info('🔍 Introspecting Token for User Info');
    const userInfo = await oauthClient.introspectToken(tokens.access_token);
    
    logger.info('📥 OAuth Introspect Response (Login)', {
      active: userInfo.active,
      user: userInfo.user ? {
        id: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name
      } : null,
      subscriptionsCount: userInfo.subscriptions?.length || 0,
      allSubscriptions: userInfo.subscriptions?.map(sub => ({
        product_id: sub.product_id,
        product_name: sub.product_name,
        device_limit: sub.device_limit || sub.metadata?.device_limit,
        rate_limit: sub.rate_limit_per_minute || sub.metadata?.rate_limit_per_minute,
        expired_at: sub.expired_at
      })) || []
    });
    
    if (!userInfo.active) {
      logger.error('❌ Token is not active');
      return res.redirect('/?error=invalid_token');
    }

    // Extract user and subscription data
    const user = userInfo.user;
    const allSubscriptions = userInfo.subscriptions || [];

    // Filter only WhatsApp Device subscriptions - STRICT: Only match configured names/IDs
    const whatsappDeviceSubs = allSubscriptions.filter(sub => {
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
      return nameMatches || idMatches;
    });

    // Sum device limits from WhatsApp Device subscriptions only
    let totalDeviceLimit = 0;
    let totalRateLimit = 0;
    
    whatsappDeviceSubs.forEach(sub => {
      const deviceLimit = sub.device_limit || sub.metadata?.device_limit || 0;
      const rateLimit = sub.rate_limit_per_minute || sub.metadata?.rate_limit_per_minute || 0;
      
      totalDeviceLimit += deviceLimit;
      totalRateLimit += rateLimit;
    });
    
    // Default to 1 device if no WhatsApp Device subscriptions
    if (totalDeviceLimit === 0) {
      totalDeviceLimit = 1;
    }
    
    // Calculate rate limit if not provided: 30 requests per device per minute
    if (totalRateLimit === 0) {
      totalRateLimit = totalDeviceLimit * 30;
    }

    // Find or create workspace
    logger.info('🏢 Checking Workspace for User', {
      userId: user.id,
      email: user.email
    });
    
    let workspaceUser = await WorkspaceUser.findByOAuthId(user.id);
    
    if (!workspaceUser) {
      // First-time user - create workspace
      const tier = 'per_device';
      const deviceLimit = totalDeviceLimit;
      const rateLimitPerMinute = totalRateLimit;
      
      const otherProductsCount = allSubscriptions.length - whatsappDeviceSubs.length;
      
      logger.info('🆕 New User - Creating Workspace', {
        user: user.email,
        whatsappDeviceSubscriptions: whatsappDeviceSubs.length,
        otherProductsIgnored: otherProductsCount,
        deviceLimit,
        rateLimitPerMinute,
        tier,
        subscriptionBreakdown: whatsappDeviceSubs.map(sub => ({
          product_name: sub.product_name,
          device_limit: sub.device_limit || sub.metadata?.device_limit
        }))
      });
      
      const workspace = await Workspace.create({
        name: `${user.name || user.email}'s Workspace`,
        subscription_tier: tier,
        device_limit: deviceLimit,
        rate_limit_per_minute: rateLimitPerMinute
      });
      
      workspaceUser = await WorkspaceUser.create({
        workspace_id: workspace.id,
        oauth_user_id: user.id,
        email: user.email,
        full_name: user.name || user.email,
        role: 'owner'
      });

      logger.info('✅ Workspace Created Successfully', {
        workspaceId: workspace.id,
        user: user.email,
        deviceLimit: workspace.device_limit,
        rateLimitPerMinute: workspace.rate_limit_per_minute
      });
    } else {
      // Existing user - sync device limit changes
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      const tier = 'per_device';
      const deviceLimit = totalDeviceLimit;
      const rateLimitPerMinute = totalRateLimit;
      
      logger.info('👤 Existing User Login', {
        user: user.email,
        workspaceId: workspace.id,
        currentDeviceLimit: workspace.device_limit,
        newDeviceLimit: deviceLimit,
        currentRateLimit: workspace.rate_limit_per_minute,
        newRateLimit: rateLimitPerMinute,
        needsSync: workspace.device_limit !== deviceLimit || workspace.rate_limit_per_minute !== rateLimitPerMinute
      });
      
      // Sync if device limit changed
      if (workspace.device_limit !== deviceLimit || workspace.rate_limit_per_minute !== rateLimitPerMinute) {
        const otherProductsCount = allSubscriptions.length - whatsappDeviceSubs.length;
        
        logger.info('🔄 Syncing Device Limit on Login', {
          user: user.email,
          workspaceId: workspace.id,
          oldDeviceLimit: workspace.device_limit,
          newDeviceLimit: deviceLimit,
          oldRateLimit: workspace.rate_limit_per_minute,
          newRateLimit: rateLimitPerMinute,
          whatsappDeviceSubscriptions: whatsappDeviceSubs.length,
          otherProductsIgnored: otherProductsCount,
          subscriptionDetails: whatsappDeviceSubs.map(sub => ({
            product_name: sub.product_name,
            device_limit: sub.device_limit || sub.metadata?.device_limit
          }))
        });
        
        await Workspace.updateSubscription(
          workspace.id,
          tier,
          { deviceLimit, rateLimitPerMinute }
        );
        
        logger.info('✅ Device Limit Synced Successfully', {
          workspaceId: workspace.id,
          user: user.email,
          deviceLimit,
          rateLimitPerMinute
        });
      } else {
        logger.info('✅ Device Limit Already Up-to-Date', {
          workspaceId: workspace.id,
          user: user.email,
          deviceLimit
        });
      }
    }
    
    // Store in session
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.user = user;
    req.session.workspaceId = workspaceUser.workspace_id;
    
    // Invalidate any cached token for this user (if they had an old token)
    const { invalidateToken } = require('../../utils/tokenCache');
    // Note: We can't invalidate by user ID easily, but new token will cache correctly
    
    // Clear OAuth state
    delete req.session.oauthState;
    
    logger.info('🎉 OAuth Login Flow Completed Successfully', {
      user: user.email,
      workspaceId: workspaceUser.workspace_id,
      deviceLimit: totalDeviceLimit
    });
    
    // Redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    logger.error('OAuth callback error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Provide more specific error messages
    let errorType = 'token_exchange_failed';
    if (error.message.includes('exchange code')) {
      errorType = 'token_exchange_failed';
    } else if (error.message.includes('introspect')) {
      errorType = 'token_introspection_failed';
    } else if (error.response?.status === 401) {
      errorType = 'invalid_credentials';
    } else if (error.response?.status === 403) {
      errorType = 'access_denied';
    }
    
    res.redirect(`/?error=${errorType}`);
  }
});

/**
 * Logout
 */
router.get('/logout', async (req, res) => {
  // Revoke token and invalidate cache
  if (req.session.accessToken) {
    try {
      await oauthClient.revokeToken(req.session.accessToken);
      const { invalidateToken } = require('../../utils/tokenCache');
      await invalidateToken(req.session.accessToken);
    } catch (error) {
      logger.error('Token revocation error:', error);
    }
  }
  
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;


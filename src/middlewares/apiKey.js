const ApiKey = require('../models/ApiKey');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const axios = require('axios');
const crypto = require('../utils/crypto');
const response = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Baileys Service API key middleware
 * For internal Baileys provider communication only
 */
async function baileysServiceMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const serviceKey = config.baileys.serviceApiKey;
  
  if (!serviceKey) {
    return response.error(res, 'Service API key not configured', 500);
  }
  
  if (apiKey === serviceKey) {
    req.isBaileysService = true;
    return next();
  }
  
  return response.unauthorized(res, 'Invalid service API key');
}

/**
 * API key authentication middleware
 * Supports both workspace API keys and device-level API keys
 */
async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return response.unauthorized(res, 'Missing API key');
  }
  
  // Check if this is a Baileys service key
  const serviceKey = config.baileys.serviceApiKey;
  if (serviceKey && apiKey === serviceKey) {
    req.isBaileysService = true;
    return next();
  }
  
  try {
    // Check if it's a device-level API key from Baileys
    // Baileys provides API keys that are 64-character hex strings
    const isDeviceApiKey = /^[a-f0-9]{64}$/.test(apiKey);

    if (isDeviceApiKey) {
      // Validate device API key with Baileys service
      // Baileys service validates the API key and returns device info
      try {
        const baileysServiceUrl = config.baileys.serviceUrl;
        if (!baileysServiceUrl) {
          logger.error('Service URL not configured');
          return response.unauthorized(res, 'Service not configured');
        }

        // Try to validate API key with Baileys service
        // Baileys service validates the API key and returns device info
        // Try multiple endpoints: /devices/me, /me, or /devices (which might return device list for this API key)
        let deviceData = null;
        let validationError = null;
        
        const endpointsToTry = [
          '/devices/me',
          '/me',
          '/device/me'
        ];
        
        for (const endpoint of endpointsToTry) {
          try {
            const validationResponse = await axios.get(
              `${baileysServiceUrl}${endpoint}`,
              {
                headers: {
                  'X-API-Token': apiKey,
                  'Content-Type': 'application/json'
                },
                timeout: 5000
              }
            );
            
            deviceData = validationResponse.data.device || validationResponse.data.data?.device || validationResponse.data;
            if (deviceData && deviceData.id) {
              break; // Found valid device info
            }
          } catch (err) {
            validationError = err;
            // Continue to next endpoint
          }
        }
        
        // If no device data found, the API key is invalid
        if (!deviceData || !deviceData.id) {
          return response.unauthorized(res, 'Invalid device API key');
        }

        // Find account in our database using external_device_id or phone number
        let account = null;
        if (deviceData.id) {
          account = await WhatsAppAccount.findByExternalDeviceId(deviceData.id);
        }
        
        if (!account && deviceData.phoneNumber) {
          account = await WhatsAppAccount.findByPhoneNumber(deviceData.phoneNumber);
        }

        if (!account) {
          logger.warn(`Device API key valid but account not found in database: ${deviceData.id || deviceData.phoneNumber}`);
          return response.unauthorized(res, 'Device not found in gateway');
        }

        if (account.status !== 'connected') {
          return response.unauthorized(res, 'Device not connected');
        }

        // Attach to request
        req.deviceApiKey = {
          accountId: account.id,
          workspaceId: account.workspace_id,
          phoneNumber: account.phone_number || deviceData.phoneNumber,
          displayName: account.display_name
        };
        req.workspaceId = account.workspace_id;
        
        return next();
      } catch (error) {
        // If Baileys service returns 401/403, the API key is invalid
        if (error.response?.status === 401 || error.response?.status === 403) {
          return response.unauthorized(res, 'Invalid device API key');
        }
        
        // Other errors (network, timeout, etc.)
        logger.error('Error validating device API key with Baileys:', error.message);
        return response.unauthorized(res, 'Failed to validate device API key');
      }
    }
    
    // Check if it's a workspace API key (starts with gw_live_ or gw_test_)
    if (apiKey.startsWith('gw_live_') || apiKey.startsWith('gw_test_')) {
      const keyHash = crypto.hashApiKey(apiKey);
      const key = await ApiKey.findByHash(keyHash);
      
      if (!key || !key.is_active) {
        return response.unauthorized(res, 'Invalid API key');
      }
      
      // Check expiration
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        return response.unauthorized(res, 'API key expired');
      }
      
      // Update last used (async, don't wait)
      ApiKey.updateLastUsed(key.id).catch(err => {
        logger.error('Failed to update API key last used:', err);
      });
      
      // Attach to request
      req.apiKey = key;
      req.workspaceId = key.workspace_id;
      
      return next();
    }
    
    return response.unauthorized(res, 'Invalid API key format');
    
  } catch (error) {
    logger.error('API key validation error:', error);
    return response.unauthorized(res, 'API key validation failed');
  }
}

/**
 * Combined authentication middleware
 * Accepts either OAuth token or API key
 */
async function authMiddleware(req, res, next) {
  const hasOAuth = req.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = req.headers['x-api-key'];

  if (!hasOAuth && !hasApiKey) {
    return response.unauthorized(res, 'Authentication required (Bearer token or X-API-Key)');
  }

  if (hasOAuth) {
    const { oauthMiddleware } = require('./oauth');
    return oauthMiddleware(req, res, next);
  } else {
    return apiKeyMiddleware(req, res, next);
  }
}

module.exports = {
  apiKeyMiddleware,
  authMiddleware,
  baileysServiceMiddleware
};


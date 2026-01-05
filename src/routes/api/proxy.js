const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const config = require('../../config');
const logger = require('../../utils/logger');
const MessageLog = require('../../models/MessageLog');
const WhatsAppAccount = require('../../models/WhatsAppAccount');

/**
 * Proxy endpoint for masking Baileys Service requests
 * End users call this app (port 4000), and we forward to BAILEYS_SERVICE_URL
 * 
 * Header mapping:
 *   User sends: API_KEY
 *   Internal forward: X-Device-API-Key
 * 
 * Endpoint mapping:
 *   User calls: /api/send
 *   Internal forward: /device/send (uses X-Device-API-Key, no X-API-Token needed)
 */

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  }
});

// Get Baileys service base URL
const getBaileysBaseUrl = () => {
  const serviceUrl = config.baileys.serviceUrl || 'http://localhost:3000/api/whatsapp';
  return serviceUrl.replace(/\/api\/whatsapp.*$/, '/api/whatsapp');
};

// Helper to get API key from user headers
const getApiKey = (req) => {
  return req.headers['api_key'] || req.headers['api-key'] || '';
};

// Helper to build headers for device/send endpoint (only X-Device-API-Key needed)
const buildDeviceHeaders = (apiKey, contentType = 'application/json') => {
  return {
    'Content-Type': contentType,
    'X-Device-API-Key': apiKey
  };
};

/**
 * Find account by API key from Baileys service
 * Returns { account, sessionId } or null
 */
async function findAccountByApiKey(apiKey) {
  try {
    // First get all sessions to find which one has this API key
    const baileysUrl = getBaileysBaseUrl();
    const response = await axios.get(`${baileysUrl}/sessions`, {
      headers: { 'X-API-Token': config.baileys.serviceApiKey || '' },
      timeout: 5000
    });

    if (!response.data.success || !response.data.sessions) {
      return null;
    }

    // For each session, we need to check if its apiKey matches
    // Since /sessions doesn't return apiKey, we need to check each device
    for (const session of response.data.sessions) {
      // Extract workspace ID from sessionId (format: workspace_X-account_Y)
      const match = session.sessionId?.match(/^workspace_(\d+)/);
      if (!match) continue;

      const workspaceId = match[1];
      
      try {
        // Get devices for this workspace
        const devicesResponse = await axios.get(`${baileysUrl}/users/workspace_${workspaceId}/devices`, {
          headers: { 'X-API-Token': config.baileys.serviceApiKey || '' },
          timeout: 5000
        });

        if (devicesResponse.data.devices) {
          const device = devicesResponse.data.devices.find(d => d.apiKey === apiKey);
          if (device) {
            // Found the device, now get our local account
            const account = await WhatsAppAccount.findByIdentifier(device.sessionId);
            if (account) {
              return { account, sessionId: device.sessionId, phoneNumber: device.phoneNumber };
            }
          }
        }
      } catch (err) {
        // Continue to next session
      }
    }

    return null;
  } catch (error) {
    logger.warn('Failed to find account by API key:', error.message);
    return null;
  }
}

/**
 * Log outgoing message to database
 */
async function logOutgoingMessage(accountInfo, messageData, baileysResponse, messageType = 'text') {
  try {
    if (!accountInfo || !accountInfo.account) {
      logger.warn('Cannot log message: account info not found');
      return null;
    }

    const { account } = accountInfo;
    
    const logData = {
      workspace_id: account.workspace_id,
      account_id: account.id,
      message_id: baileysResponse.messageId || null,
      direction: 'outgoing',
      from_number: account.phone_number || accountInfo.phoneNumber,
      to_number: messageData.recipient,
      message_type: messageType,
      content: messageData.message || messageData.caption || null,
      media_url: null,
      caption: messageData.caption || null,
      status: baileysResponse.success ? 'sent' : 'failed',
      error_message: baileysResponse.success ? null : (baileysResponse.error || 'Unknown error'),
      provider_response: JSON.stringify(baileysResponse)
    };

    const messageLog = await MessageLog.create(logData);
    logger.info(`Proxy message logged: ${messageLog.id}`, { 
      messageId: baileysResponse.messageId,
      recipient: messageData.recipient 
    });
    
    return messageLog;
  } catch (error) {
    logger.error('Failed to log proxy message:', error.message);
    return null;
  }
}

/**
 * POST /send - Send text message
 * Forwards to: /device/send
 */
router.post('/send', async (req, res) => {
  try {
    const baileysUrl = `${getBaileysBaseUrl()}/device/send`;
    const apiKey = getApiKey(req);
    
    logger.info('Proxying send request', { url: baileysUrl, recipient: req.body.recipient });

    const response = await axios.post(baileysUrl, req.body, {
      headers: buildDeviceHeaders(apiKey),
      timeout: config.baileys.sendTimeout || 30000
    });

    // Log the message
    const accountInfo = await findAccountByApiKey(apiKey);
    await logOutgoingMessage(accountInfo, req.body, response.data, 'text');

    return res.status(response.status).json(response.data);
  } catch (error) {
    // Log failed message
    const apiKey = getApiKey(req);
    const accountInfo = await findAccountByApiKey(apiKey);
    if (accountInfo) {
      await logOutgoingMessage(accountInfo, req.body, { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }, 'text');
    }
    
    return handleProxyError(error, res, 'send');
  }
});

/**
 * POST /send/image - Send image message with file upload
 * Forwards to: /device/send with image field
 */
router.post('/send/image', upload.single('file'), async (req, res) => {
  try {
    const baileysUrl = `${getBaileysBaseUrl()}/device/send`;
    const apiKey = getApiKey(req);
    
    logger.info('Proxying send/image request', { url: baileysUrl, recipient: req.body.recipient });

    let response;
    if (req.file) {
      // Multipart file upload - use 'image' field name as per API spec
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('recipient', req.body.recipient);
      if (req.body.message) formData.append('message', req.body.message);
      if (req.body.caption) formData.append('message', req.body.caption); // caption maps to message

      response = await axios.post(baileysUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Device-API-Key': apiKey
        },
        timeout: config.baileys.sendTimeout || 30000
      });
    } else {
      // JSON request (no file)
      response = await axios.post(baileysUrl, req.body, {
        headers: buildDeviceHeaders(apiKey),
        timeout: config.baileys.sendTimeout || 30000
      });
    }

    // Log the message
    const accountInfo = await findAccountByApiKey(apiKey);
    await logOutgoingMessage(accountInfo, req.body, response.data, 'image');

    return res.status(response.status).json(response.data);
  } catch (error) {
    const apiKey = getApiKey(req);
    const accountInfo = await findAccountByApiKey(apiKey);
    if (accountInfo) {
      await logOutgoingMessage(accountInfo, req.body, { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }, 'image');
    }
    
    return handleProxyError(error, res, 'send/image');
  }
});

/**
 * POST /send/video - Send video message with file upload
 * Forwards to: /device/send with video field
 */
router.post('/send/video', upload.single('file'), async (req, res) => {
  try {
    const baileysUrl = `${getBaileysBaseUrl()}/device/send`;
    const apiKey = getApiKey(req);
    
    logger.info('Proxying send/video request', { url: baileysUrl, recipient: req.body.recipient });

    let response;
    if (req.file) {
      const formData = new FormData();
      formData.append('video', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('recipient', req.body.recipient);
      if (req.body.message) formData.append('message', req.body.message);
      if (req.body.caption) formData.append('message', req.body.caption);

      response = await axios.post(baileysUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Device-API-Key': apiKey
        },
        timeout: config.baileys.sendTimeout || 30000
      });
    } else {
      response = await axios.post(baileysUrl, req.body, {
        headers: buildDeviceHeaders(apiKey),
        timeout: config.baileys.sendTimeout || 30000
      });
    }

    // Log the message
    const accountInfo = await findAccountByApiKey(apiKey);
    await logOutgoingMessage(accountInfo, req.body, response.data, 'video');

    return res.status(response.status).json(response.data);
  } catch (error) {
    const apiKey = getApiKey(req);
    const accountInfo = await findAccountByApiKey(apiKey);
    if (accountInfo) {
      await logOutgoingMessage(accountInfo, req.body, { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }, 'video');
    }
    
    return handleProxyError(error, res, 'send/video');
  }
});

/**
 * POST /send/document - Send document message with file upload
 * Forwards to: /device/send with document field
 */
router.post('/send/document', upload.single('file'), async (req, res) => {
  try {
    const baileysUrl = `${getBaileysBaseUrl()}/device/send`;
    const apiKey = getApiKey(req);
    
    logger.info('Proxying send/document request', { url: baileysUrl, recipient: req.body.recipient });

    let response;
    if (req.file) {
      const formData = new FormData();
      formData.append('document', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('recipient', req.body.recipient);
      if (req.body.message) formData.append('message', req.body.message);
      if (req.body.fileName) formData.append('fileName', req.body.fileName);

      response = await axios.post(baileysUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Device-API-Key': apiKey
        },
        timeout: config.baileys.sendTimeout || 30000
      });
    } else {
      response = await axios.post(baileysUrl, req.body, {
        headers: buildDeviceHeaders(apiKey),
        timeout: config.baileys.sendTimeout || 30000
      });
    }

    // Log the message
    const accountInfo = await findAccountByApiKey(apiKey);
    await logOutgoingMessage(accountInfo, req.body, response.data, 'document');

    return res.status(response.status).json(response.data);
  } catch (error) {
    const apiKey = getApiKey(req);
    const accountInfo = await findAccountByApiKey(apiKey);
    if (accountInfo) {
      await logOutgoingMessage(accountInfo, req.body, { 
        success: false, 
        error: error.response?.data?.error || error.message 
      }, 'document');
    }
    
    return handleProxyError(error, res, 'send/document');
  }
});

/**
 * Error handler for proxy requests
 */
function handleProxyError(error, res, endpoint) {
  logger.error(`Proxy ${endpoint} error:`, error.message);
  
  if (error.response) {
    return res.status(error.response.status).json(error.response.data);
  }
  
  return res.status(500).json({
    success: false,
    error: 'Failed to connect to messaging service',
    details: error.message
  });
}

module.exports = router;

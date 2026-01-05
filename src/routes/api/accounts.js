const express = require('express');
const router = express.Router();
const multer = require('multer');
const accountController = require('../../controllers/accountController');
const { authMiddleware } = require('../../middlewares/apiKey');
const { workspaceContextMiddleware } = require('../../middlewares/oauth');
const rateLimiter = require('../../middlewares/rateLimiter');
const { createAccountValidation, idParamValidation } = require('../../middlewares/validator');
const { param } = require('express-validator');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  }
});

// Apply authentication and workspace context to all routes
// Support both API key authentication and session-based authentication (for dashboard)
router.use(async (req, res, next) => {
  // Try API key authentication first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return authMiddleware(req, res, next);
  }

  // For dashboard usage, check session
  if (req.session?.user) {
    // Set user from session for workspace context middleware
    req.user = req.session.user;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required (X-API-Key or session)'
  });
});
router.use(workspaceContextMiddleware);
router.use(rateLimiter);

// Device routes (matching API_CURL_COMMANDS.md documentation)
router.post('/devices', createAccountValidation, asyncHandler(accountController.create.bind(accountController)));
router.get('/sessions', asyncHandler(accountController.list.bind(accountController)));
router.get('/devices/:id', idParamValidation, asyncHandler(accountController.get.bind(accountController)));
router.get('/devices/:id/qr', idParamValidation, asyncHandler(accountController.getQR.bind(accountController)));
router.get('/devices/:id/status', idParamValidation, asyncHandler(accountController.getStatus.bind(accountController)));
router.get('/devices/:id/device-key', idParamValidation, asyncHandler(accountController.getDeviceKey.bind(accountController)));
router.delete('/devices/:id', idParamValidation, asyncHandler(accountController.delete.bind(accountController)));

// Device feature routes
router.get('/devices/:id/contacts', idParamValidation, asyncHandler(accountController.getContacts.bind(accountController)));
router.get('/devices/:id/chats', idParamValidation, asyncHandler(accountController.getChats.bind(accountController)));
router.get('/devices/:id/groups', idParamValidation, asyncHandler(accountController.getGroups.bind(accountController)));
router.post('/devices/:id/sync', idParamValidation, asyncHandler(accountController.syncAutoReplyRules.bind(accountController)));

// Get contacts/chats from provider store
router.get('/devices/:id/contacts/store', idParamValidation, asyncHandler(accountController.getContacts.bind(accountController)));
router.get('/devices/:id/chats/store', idParamValidation, asyncHandler(accountController.getChats.bind(accountController)));
// Backward compatibility aliases
router.get('/devices/:id/contacts/baileys-store', idParamValidation, asyncHandler(accountController.getContacts.bind(accountController)));
router.get('/devices/:id/chats/baileys-store', idParamValidation, asyncHandler(accountController.getChats.bind(accountController)));

// Group management
router.get('/devices/:id/groups/:groupId/members', [idParamValidation, param('groupId').isString().notEmpty()], asyncHandler(accountController.getGroups.bind(accountController)));

// Profile and presence
router.get('/devices/:id/profile/:jid', [idParamValidation, param('jid').isString().notEmpty()], asyncHandler(accountController.get.bind(accountController)));
router.get('/devices/:id/presence/:jid', [idParamValidation, param('jid').isString().notEmpty()], asyncHandler(accountController.getStatus.bind(accountController)));
router.get('/devices/:id/business/:jid', [idParamValidation, param('jid').isString().notEmpty()], asyncHandler(accountController.get.bind(accountController)));

// Webhook settings
router.get('/devices/:id/settings/webhook', idParamValidation, asyncHandler(accountController.getWebhookSettings.bind(accountController)));
router.put('/devices/:id/settings/webhook', idParamValidation, asyncHandler(accountController.updateWebhookSettings.bind(accountController)));

// AI settings (device settings endpoint)
router.get('/devices/:id/settings/ai', idParamValidation, asyncHandler(accountController.getAISettings.bind(accountController)));
router.put('/devices/:id/settings/ai', idParamValidation, asyncHandler(accountController.configureAI.bind(accountController)));

// AI settings (short endpoint for dashboard compatibility)
router.get('/:id/ai', idParamValidation, asyncHandler(accountController.getAISettings.bind(accountController)));
router.put('/:id/ai', idParamValidation, asyncHandler(accountController.configureAI.bind(accountController)));

// Device operations
router.post('/devices/:id/login', idParamValidation, asyncHandler(accountController.login.bind(accountController)));
router.post('/devices/:id/logout', idParamValidation, asyncHandler(accountController.logout.bind(accountController)));
router.post('/devices/:id/reconnect', idParamValidation, asyncHandler(accountController.reconnect.bind(accountController)));

// Business features
router.get('/devices/:id/business-templates', idParamValidation, asyncHandler(accountController.getBusinessTemplates.bind(accountController)));
router.put('/devices/:id/business-config', idParamValidation, asyncHandler(accountController.updateBusinessConfig.bind(accountController)));

// Business features (short endpoint for dashboard compatibility)
router.get('/:id/business-templates', idParamValidation, asyncHandler(accountController.getBusinessTemplates.bind(accountController)));
router.put('/:id/business-config', idParamValidation, asyncHandler(accountController.updateBusinessConfig.bind(accountController)));

// Chat settings (11 endpoints)
router.get('/devices/:id/chat-settings', idParamValidation, asyncHandler(accountController.getAllChatSettings.bind(accountController)));
router.get('/devices/:id/chat-settings/summary', idParamValidation, asyncHandler(accountController.getChatSettingsSummary.bind(accountController)));
router.get('/devices/:id/chat-settings/:phoneNumber', [idParamValidation, param('phoneNumber').isString().notEmpty()], asyncHandler(accountController.getChatSettings.bind(accountController)));
router.put('/devices/:id/chat-settings/:phoneNumber', [idParamValidation, param('phoneNumber').isString().notEmpty()], asyncHandler(accountController.updateChatSettings.bind(accountController)));
router.post('/devices/:id/chat-settings/bulk-update', idParamValidation, asyncHandler(accountController.bulkUpdateChatSettings.bind(accountController)));
router.get('/devices/:id/chat-settings/:phoneNumber/conversation', [idParamValidation, param('phoneNumber').isString().notEmpty()], asyncHandler(accountController.getChatConversation.bind(accountController)));
router.get('/devices/:id/chat-settings/:phoneNumber/stats', [idParamValidation, param('phoneNumber').isString().notEmpty()], asyncHandler(accountController.getChatStats.bind(accountController)));
router.patch('/devices/:id/:chatId/memory', [idParamValidation, param('chatId').isString().notEmpty()], asyncHandler(accountController.updateMemorySettings.bind(accountController)));
router.delete('/devices/:id/:chatId/memory', [idParamValidation, param('chatId').isString().notEmpty()], asyncHandler(accountController.clearConversationMemory.bind(accountController)));

// File management routes (for product image upload)
router.post('/files/upload', upload.single('file'), asyncHandler(accountController.uploadFile.bind(accountController)));

// Test AI (short endpoint for dashboard)
router.post('/test-ai-short', asyncHandler(accountController.testAI.bind(accountController)));
router.get('/files', asyncHandler(accountController.getFileInfo.bind(accountController)));
router.get('/files/search', asyncHandler(accountController.getFileInfo.bind(accountController)));
router.get('/files/:fileId', asyncHandler(accountController.getFileInfo.bind(accountController)));
router.put('/files/:fileId', asyncHandler(accountController.getFileInfo.bind(accountController)));
router.delete('/files/:fileId', asyncHandler(accountController.deleteFile.bind(accountController)));
router.delete('/files/bulk', asyncHandler(accountController.deleteFile.bind(accountController)));
router.get('/files/users/:userId/stats', asyncHandler(accountController.getFileInfo.bind(accountController)));
router.get('/files/:fileId/preview', asyncHandler(accountController.getFileInfo.bind(accountController)));
// Deprecated routes for backward compatibility
router.get('/files/users/:userId/:fileType', asyncHandler(accountController.getFileInfo.bind(accountController)));

// User-specific routes
router.get('/users/:userId/devices', asyncHandler(accountController.list.bind(accountController)));
router.get('/users/:userId/contacts', asyncHandler(accountController.getContacts.bind(accountController)));
router.get('/users/:userId/message-logs', asyncHandler(accountController.get.bind(accountController)));
router.get('/users/:userId/sending-stats', asyncHandler(accountController.getStatus.bind(accountController)));

// Session management routes
router.post('/sessions/:sessionId/cancel', asyncHandler(accountController.cancelSession.bind(accountController)));

// AI testing routes
router.post('/test-ai', asyncHandler(accountController.testAI.bind(accountController)));
router.get('/ai/providers', asyncHandler(accountController.getAIProviders.bind(accountController)));

// Device info routes
router.get('/devices/:id/device-info', idParamValidation, asyncHandler(accountController.getDeviceInfo.bind(accountController)));
router.post('/devices/:id/sync-api-key', idParamValidation, asyncHandler(accountController.syncDeviceApiKey.bind(accountController)));

// Server monitoring routes
router.get('/server/stats', asyncHandler(async (req, res) => {
  try {
    const os = require('os');
    const process = require('process');

    // Get system information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const stats = {
      cpu: {
        usage: 0, // Would need additional library like 'pidusage' or 'os-utils' for actual CPU usage
        cores: os.cpus().length
      },
      memory: {
        usagePercent: Math.round((usedMemory / totalMemory) * 100),
        formatted: {
          used: `${Math.round(usedMemory / 1024 / 1024)}MB`,
          total: `${Math.round(totalMemory / 1024 / 1024)}MB`
        }
      },
      disk: {
        usagePercent: 0, // Would need 'fs' module or external library
        used: '0GB',
        total: '0GB'
      },
      process: {
        pid: process.pid,
        memory: {
          formatted: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`
          }
        }
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      uptime: {
        formatted: {
          system: `${Math.floor(os.uptime() / 86400)} days`,
          process: `${Math.floor(process.uptime() / 3600)} hours`
        }
      }
    };

    return response.success(res, stats, 'Server stats retrieved successfully');
  } catch (error) {
    logger.error('Server stats error:', error);
    return response.error(res, error.message, 500);
  }
}));

module.exports = router;


const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const messageController = require('../../controllers/messageController');
const { authMiddleware } = require('../../middlewares/apiKey');
const { workspaceContextMiddleware } = require('../../middlewares/oauth');
const rateLimiter = require('../../middlewares/rateLimiter');
const { sendMessageValidation, idParamValidation, paginationValidation, handleValidationErrors } = require('../../middlewares/validator');
const { asyncHandler } = require('../../middlewares/errorHandler');
const logger = require('../../utils/logger');
const response = require('../../utils/response');

// Configure multer for media uploads
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit for media files
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
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

// ==================== Core Messaging ====================
router.post('/send', sendMessageValidation, asyncHandler(messageController.send.bind(messageController)));
router.get('/messages', paginationValidation, asyncHandler(messageController.list.bind(messageController)));
router.get('/messages/stats', asyncHandler(messageController.getStats.bind(messageController)));
router.get('/messages/:id', idParamValidation, asyncHandler(messageController.get.bind(messageController)));
router.get('/messages/:id/status', idParamValidation, asyncHandler(messageController.get.bind(messageController)));
router.post('/messages/:id/resend', idParamValidation, asyncHandler(messageController.send.bind(messageController)));

// ==================== Media Messaging ====================
router.post('/send/image',
  mediaUpload.single('file'),
  body('sessionId').optional().isString(),
  body('accountId').optional().isNumeric(),
  body('recipient').isString().notEmpty().withMessage('recipient is required'),
  body('fileId').optional().isString(),
  body('caption').optional().isString(),
  handleValidationErrors,
  asyncHandler(messageController.sendImage.bind(messageController))
);

router.post('/send/video',
  mediaUpload.single('file'),
  body('sessionId').optional().isString(),
  body('accountId').optional().isNumeric(),
  body('recipient').isString().notEmpty().withMessage('recipient is required'),
  body('fileId').optional().isString(),
  body('caption').optional().isString(),
  handleValidationErrors,
  asyncHandler(messageController.sendVideo.bind(messageController))
);

router.post('/send/document',
  mediaUpload.single('file'),
  body('sessionId').optional().isString(),
  body('accountId').optional().isNumeric(),
  body('recipient').isString().notEmpty().withMessage('recipient is required'),
  body('fileId').optional().isString(),
  body('fileName').optional().isString(),
  handleValidationErrors,
  asyncHandler(messageController.sendDocument.bind(messageController))
);

// Bulk and batch messaging
router.post('/send/bulk',
  body('sessionId').optional().isString(),
  body('recipients').isArray().withMessage('recipients must be an array'),
  body('fileIds').isArray().withMessage('fileIds must be an array'),
  body('caption').optional().isString(),
  handleValidationErrors,
  asyncHandler(messageController.send.bind(messageController))
);

router.post('/send/mixed',
  body('sessionId').optional().isString(),
  body('recipient').isString().notEmpty().withMessage('recipient is required'),
  body('media').isArray().withMessage('media must be an array'),
  handleValidationErrors,
  asyncHandler(messageController.send.bind(messageController))
);

router.post('/send/batch',
  body('sessionId').optional().isString(),
  body('batches').isArray().withMessage('batches must be an array'),
  handleValidationErrors,
  asyncHandler(messageController.send.bind(messageController))
);

// Device API Key sending (no API Token required, only Device API Key)
router.post('/device/send',
  mediaUpload.single('image'),
  body('recipient').isString().notEmpty().withMessage('recipient is required'),
  body('message').optional().isString(),
  handleValidationErrors,
  asyncHandler(messageController.send.bind(messageController))
);

// ==================== API Masking for Auto-Sending ====================

/**
 * @api {post} /api/messages/auto-send Auto Send Message (API Masking)
 * @apiName AutoSendMessage
 * @apiGroup Messages
 * @apiVersion 1.0.0
 * @apiDescription Simplified API for auto-sending WhatsApp messages from business systems
 *
 * @apiHeader {String} X-API-Key Device API key for authentication
 * @apiParam {String} to Recipient phone number (E.164 format: +628123456789)
 * @apiParam {String} message Message content
 * @apiParam {String} [type=text] Message type: text, image, document
 * @apiParam {String} [template] Template name to use
 * @apiParam {Object} [variables] Template variables for personalization
 *
 * @apiSuccess {String} messageId WhatsApp message ID
 * @apiSuccess {String} status Message status
 * @apiSuccess {Date} sentAt When message was sent
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": {
 *         "messageId": "3EB0123456789",
 *         "status": "sent",
 *         "sentAt": "2024-01-05T02:40:00.000Z"
 *       }
 *     }
 *
 * @apiErrorExample Error-Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "success": false,
 *       "error": "Device not connected"
 *     }
 */
router.post('/auto-send',
  body('to').isString().notEmpty().withMessage('Recipient phone number is required'),
  body('message').optional().isString(),
  body('template').optional().isString(),
  body('variables').optional().isObject(),
  body('type').optional().isIn(['text', 'image', 'document', 'video']).withMessage('Invalid message type'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    try {
      const { to, message, template, variables, type = 'text' } = req.body;

      // Get account ID from device API key authentication
      let accountId, workspaceId;

      if (req.deviceApiKey) {
        accountId = req.deviceApiKey.accountId;
        workspaceId = req.deviceApiKey.workspaceId;
      } else {
        return response.error(res, 'Device API key authentication required', 401);
      }

      // Handle template rendering if template is specified
      let finalMessage = message;
      if (template && !message) {
        // Load template and render with variables
        const Template = require('../../models/MessageTemplate');
        const templateRecord = await Template.findByName(template, workspaceId);

        if (!templateRecord) {
          return response.error(res, `Template '${template}' not found`, 404);
        }

        finalMessage = templateRecord.content;

        // Replace variables in template
        if (variables) {
          Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            finalMessage = finalMessage.replace(new RegExp(placeholder, 'g'), variables[key]);
          });
        }
      }

      if (!finalMessage) {
        return response.error(res, 'Either message or template is required', 400);
      }

      // Send the message
      const messageService = require('../../services/messageService');
      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient: to,
        type,
        content: {
          text: finalMessage
        }
      });

      return response.success(res, {
        messageId: result.messageId,
        status: result.status,
        sentAt: result.sentAt,
        recipient: to
      }, 'Message sent successfully');

    } catch (error) {
      logger.error('Auto-send message error:', error);
      return response.error(res, error.message, 400);
    }
  })
);

/**
 * @api {post} /api/messages/bulk-send Bulk Send Messages (API Masking)
 * @apiName BulkSendMessages
 * @apiGroup Messages
 * @apiVersion 1.0.0
 * @apiDescription Send messages to multiple recipients automatically
 *
 * @apiHeader {String} X-API-Key Device API key for authentication
 * @apiParam {Array} messages Array of message objects
 * @apiParam {String} messages.to Recipient phone number
 * @apiParam {String} messages.message Message content
 * @apiParam {String} [messages.template] Template name
 * @apiParam {Object} [messages.variables] Template variables
 *
 * @apiSuccess {Array} results Array of send results
 * @apiSuccess {String} results.messageId WhatsApp message ID
 * @apiSuccess {String} results.status Message status
 * @apiSuccess {String} results.recipient Recipient phone number
 * @apiSuccess {Boolean} results.success Whether send was successful
 * @apiSuccess {String} [results.error] Error message if failed
 */
router.post('/bulk-send',
  body('messages').isArray().withMessage('messages must be an array'),
  body('messages.*.to').isString().notEmpty().withMessage('Recipient phone number is required for each message'),
  body('messages.*.message').optional().isString(),
  body('messages.*.template').optional().isString(),
  body('messages.*.variables').optional().isObject(),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    try {
      const { messages } = req.body;

      // Get account ID from device API key authentication
      let accountId, workspaceId;

      if (req.deviceApiKey) {
        accountId = req.deviceApiKey.accountId;
        workspaceId = req.deviceApiKey.workspaceId;
      } else {
        return response.error(res, 'Device API key authentication required', 401);
      }

      const results = [];
      const messageService = require('../../services/messageService');
      const Template = require('../../models/MessageTemplate');

      // Process each message with rate limiting
      for (const msg of messages) {
        try {
          const { to, message, template, variables } = msg;

          // Handle template rendering
          let finalMessage = message;
          if (template && !message) {
            const templateRecord = await Template.findByName(template, workspaceId);
            if (templateRecord) {
              finalMessage = templateRecord.content;
              if (variables) {
                Object.keys(variables).forEach(key => {
                  const placeholder = `{{${key}}}`;
                  finalMessage = finalMessage.replace(new RegExp(placeholder, 'g'), variables[key]);
                });
              }
            }
          }

          if (!finalMessage) {
            results.push({
              recipient: to,
              success: false,
              error: 'Either message or valid template is required'
            });
            continue;
          }

          // Send the message
          const result = await messageService.sendMessage(workspaceId, {
            accountId,
            recipient: to,
            type: 'text',
            content: { text: finalMessage }
          });

          results.push({
            recipient: to,
            success: true,
            messageId: result.messageId,
            status: result.status,
            sentAt: result.sentAt
          });

          // Rate limiting delay (500ms between messages)
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          results.push({
            recipient: msg.to,
            success: false,
            error: error.message
          });
        }
      }

      return response.success(res, results, `Processed ${results.length} messages`);

    } catch (error) {
      logger.error('Bulk send error:', error);
      return response.error(res, error.message, 400);
    }
  })
);

/**
 * @api {post} /api/messages/send-template Send Template Message (API Masking)
 * @apiName SendTemplateMessage
 * @apiGroup Messages
 * @apiVersion 1.0.0
 * @apiDescription Send a pre-defined template message with variables
 *
 * @apiHeader {String} X-API-Key Device API key for authentication
 * @apiParam {String} to Recipient phone number
 * @apiParam {String} template Template name
 * @apiParam {Object} variables Template variables (e.g., {"name": "John", "order_id": "12345"})
 *
 * @apiSuccess {String} messageId WhatsApp message ID
 * @apiSuccess {String} status Message status
 * @apiSuccess {String} template Template name used
 * @apiSuccess {Object} variables Variables used in template
 */
router.post('/send-template',
  body('to').isString().notEmpty().withMessage('Recipient phone number is required'),
  body('template').isString().notEmpty().withMessage('Template name is required'),
  body('variables').optional().isObject(),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    try {
      const { to, template, variables = {} } = req.body;

      // Get account ID from device API key authentication
      let accountId, workspaceId;

      if (req.deviceApiKey) {
        accountId = req.deviceApiKey.accountId;
        workspaceId = req.deviceApiKey.workspaceId;
      } else {
        return response.error(res, 'Device API key authentication required', 401);
      }

      // Load and render template
      const Template = require('../../models/MessageTemplate');
      const templateRecord = await Template.findByName(template, workspaceId);

      if (!templateRecord) {
        return response.error(res, `Template '${template}' not found`, 404);
      }

      let message = templateRecord.content;

      // Replace variables in template
      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        message = message.replace(new RegExp(placeholder, 'g'), variables[key]);
      });

      // Send the message
      const messageService = require('../../services/messageService');
      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient: to,
        type: 'text',
        content: { text: message }
      });

      return response.success(res, {
        messageId: result.messageId,
        status: result.status,
        sentAt: result.sentAt,
        template: template,
        variables: variables,
        recipient: to
      }, 'Template message sent successfully');

    } catch (error) {
      logger.error('Send template message error:', error);
      return response.error(res, error.message, 400);
    }
  })
);

module.exports = router;


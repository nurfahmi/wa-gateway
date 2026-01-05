const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/apiKey');
const { workspaceContextMiddleware } = require('../../middlewares/oauth');
const rateLimiter = require('../../middlewares/rateLimiter');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../../middlewares/validator');
const response = require('../../utils/response');
const logger = require('../../utils/logger');

// Apply authentication and workspace context to all routes
router.use(async (req, res, next) => {
  // Try API key authentication first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    return authMiddleware(req, res, next);
  }

  // For dashboard usage, check session
  if (req.session?.user) {
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

// ==================== Campaign Management ====================

// Create campaign
router.post('/campaigns',
  body('name').notEmpty().withMessage('Campaign name is required'),
  body('deviceId').isInt().withMessage('Device ID is required'),
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('targetNumbers').isArray().withMessage('Target numbers must be an array'),
  body('messagesPerDay').isInt().withMessage('Messages per day must be a number'),
  body('delayBetweenMessages').optional().isInt(),
  body('schedule').optional().isObject(),
  body('autoStart').optional().isBoolean(),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    // Warmer feature is not implemented yet
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Get all campaigns
router.get('/campaigns',
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Get campaign details
router.get('/campaigns/:id',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Update campaign
router.put('/campaigns/:id',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Pause campaign
router.post('/campaigns/:id/pause',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Resume campaign
router.post('/campaigns/:id/resume',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Stop campaign
router.post('/campaigns/:id/stop',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Delete campaign
router.delete('/campaigns/:id',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// ==================== Campaign Templates ====================

// Create conversation template
router.post('/campaigns/:id/templates',
  param('id').isInt().withMessage('Invalid campaign ID'),
  body('name').notEmpty().withMessage('Template name is required'),
  body('conversation').isArray().withMessage('Conversation must be an array'),
  body('isActive').optional().isBoolean(),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Get campaign templates
router.get('/campaigns/:id/templates',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// ==================== Campaign Statistics ====================

// Get campaign statistics
router.get('/campaigns/:id/stats',
  param('id').isInt().withMessage('Invalid campaign ID'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Get conversation logs
router.get('/campaigns/:id/logs',
  param('id').isInt().withMessage('Invalid campaign ID'),
  query('limit').optional().isInt(),
  query('offset').optional().isInt(),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// ==================== Warmer Utilities ====================

// Get available devices for warmer
router.get('/devices',
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

// Get default templates
router.get('/templates/defaults',
  asyncHandler(async (req, res) => {
    return response.error(res, 'Warmer feature requires WARMER_ENABLED=true in .env file', 501);
  })
);

module.exports = router;


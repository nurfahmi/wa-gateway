const express = require('express');
const router = express.Router();
const automationController = require('../../controllers/automationController');
const { asyncHandler } = require('../../middlewares/errorHandler');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../../middlewares/validator');

// ==================== Auto-Reply Rules ====================

router.get('/rules', asyncHandler(automationController.getRules));

router.post('/rules',
  body('name').notEmpty().withMessage('Name is required'),
  body('trigger_type').isIn(['keyword', 'exact_match', 'contains', 'regex', 'business_hours', 'welcome', 'fallback'])
    .withMessage('Invalid trigger type'),
  body('reply_message').notEmpty().withMessage('Reply message is required'),
  handleValidationErrors,
  asyncHandler(automationController.createRule)
);

router.put('/rules/:id',
  param('id').isInt().withMessage('Invalid rule ID'),
  handleValidationErrors,
  asyncHandler(automationController.updateRule)
);

router.delete('/rules/:id',
  param('id').isInt().withMessage('Invalid rule ID'),
  handleValidationErrors,
  asyncHandler(automationController.deleteRule)
);

router.patch('/rules/:id/toggle',
  param('id').isInt().withMessage('Invalid rule ID'),
  body('is_active').isBoolean().withMessage('is_active must be boolean'),
  handleValidationErrors,
  asyncHandler(automationController.toggleRule)
);

// ==================== AI Configuration ====================

router.get('/ai/config', asyncHandler(automationController.getAIConfig));

router.put('/ai/config',
  body('is_enabled').optional().isBoolean(),
  body('provider').optional().isString(),
  body('model').optional().isString(),
  body('auto_reply_enabled').optional().isBoolean(),
  handleValidationErrors,
  asyncHandler(automationController.updateAIConfig)
);

router.post('/ai/toggle',
  body('enabled').isBoolean().withMessage('enabled must be boolean'),
  handleValidationErrors,
  asyncHandler(automationController.toggleAI)
);

router.delete('/ai/history/:contactPhone',
  param('contactPhone').notEmpty().withMessage('Contact phone is required'),
  handleValidationErrors,
  asyncHandler(automationController.clearHistory)
);

// ==================== Templates ====================

router.get('/templates', asyncHandler(automationController.getTemplates));

router.get('/templates/:id',
  param('id').isInt().withMessage('Invalid template ID'),
  handleValidationErrors,
  asyncHandler(automationController.getTemplate)
);

router.post('/templates',
  body('name').notEmpty().withMessage('Name is required'),
  body('content').notEmpty().withMessage('Content is required'),
  handleValidationErrors,
  asyncHandler(automationController.createTemplate)
);

router.put('/templates/:id',
  param('id').isInt().withMessage('Invalid template ID'),
  handleValidationErrors,
  asyncHandler(automationController.updateTemplate)
);

router.delete('/templates/:id',
  param('id').isInt().withMessage('Invalid template ID'),
  handleValidationErrors,
  asyncHandler(automationController.deleteTemplate)
);

router.patch('/templates/:id/favorite',
  param('id').isInt().withMessage('Invalid template ID'),
  body('is_favorite').isBoolean().withMessage('is_favorite must be boolean'),
  handleValidationErrors,
  asyncHandler(automationController.toggleFavorite)
);

// ==================== Scheduled Messages ====================

router.get('/scheduled', asyncHandler(automationController.getScheduledMessages));

router.post('/scheduled',
  body('account_id').isInt().withMessage('Account ID is required'),
  body('recipient').notEmpty().withMessage('Recipient is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('scheduled_at').isISO8601().withMessage('Valid scheduled_at date is required'),
  handleValidationErrors,
  asyncHandler(automationController.scheduleMessage)
);

router.delete('/scheduled/:id',
  param('id').isInt().withMessage('Invalid scheduled message ID'),
  handleValidationErrors,
  asyncHandler(automationController.cancelScheduledMessage)
);

// ==================== Broadcast Messages ====================

router.get('/broadcasts', asyncHandler(automationController.getBroadcasts));

router.get('/broadcasts/:id',
  param('id').isInt().withMessage('Invalid broadcast ID'),
  handleValidationErrors,
  asyncHandler(automationController.getBroadcast)
);

router.post('/broadcasts',
  body('account_id').isInt().withMessage('Account ID is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('target_type').isIn(['all_contacts', 'group', 'custom']).withMessage('Invalid target type'),
  body('target_phone_numbers').if(body('target_type').equals('custom'))
    .isArray().withMessage('target_phone_numbers must be an array for custom target'),
  handleValidationErrors,
  asyncHandler(automationController.createBroadcast)
);

router.put('/broadcasts/:id',
  param('id').isInt().withMessage('Invalid broadcast ID'),
  handleValidationErrors,
  asyncHandler(automationController.updateBroadcast)
);

router.delete('/broadcasts/:id',
  param('id').isInt().withMessage('Invalid broadcast ID'),
  handleValidationErrors,
  asyncHandler(automationController.deleteBroadcast)
);

// ==================== Contacts ====================

router.get('/contacts', asyncHandler(automationController.getContacts));

router.get('/contacts/stats', asyncHandler(automationController.getContactStats));

router.get('/contacts/:id',
  param('id').isInt().withMessage('Invalid contact ID'),
  handleValidationErrors,
  asyncHandler(automationController.getContact)
);

router.post('/contacts',
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  handleValidationErrors,
  asyncHandler(automationController.createContact)
);

router.put('/contacts/:id',
  param('id').isInt().withMessage('Invalid contact ID'),
  handleValidationErrors,
  asyncHandler(automationController.updateContact)
);

router.delete('/contacts/:id',
  param('id').isInt().withMessage('Invalid contact ID'),
  handleValidationErrors,
  asyncHandler(automationController.deleteContact)
);

router.post('/contacts/:id/block',
  param('id').isInt().withMessage('Invalid contact ID'),
  handleValidationErrors,
  asyncHandler(automationController.blockContact)
);

router.post('/contacts/:id/unblock',
  param('id').isInt().withMessage('Invalid contact ID'),
  handleValidationErrors,
  asyncHandler(automationController.unblockContact)
);

router.post('/contacts/import',
  body('contacts').isArray().withMessage('contacts must be an array'),
  handleValidationErrors,
  asyncHandler(automationController.importContacts)
);

router.get('/contacts/export', asyncHandler(automationController.exportContacts));

module.exports = router;


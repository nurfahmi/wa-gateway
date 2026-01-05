const { body, param, query, validationResult } = require('express-validator');
const response = require('../utils/response');
const phoneNumber = require('../utils/phoneNumber');

/**
 * Validation error handler
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return response.validationError(res, errors.array());
  }
  next();
}

/**
 * Validation rules for sending messages
 */
const sendMessageValidation = [
  // accountId is required unless authenticated via device API key
  body('accountId')
    .optional()
    .isInt()
    .toInt()
    .withMessage('accountId must be a number'),
  body('recipient')
    .custom((value) => phoneNumber.isValidE164(value))
    .withMessage('recipient must be a valid E.164 phone number'),
  body('type').isIn(['text', 'image', 'document', 'video', 'audio']).withMessage('Invalid message type'),
  body('content').isObject().withMessage('content must be an object'),
  body('content.text')
    .if(body('type').equals('text'))
    .notEmpty()
    .withMessage('content.text is required for text messages'),
  body('content.mediaUrl')
    .if(body('type').isIn(['image', 'document', 'video', 'audio']))
    .isURL()
    .withMessage('content.mediaUrl must be a valid URL for media messages'),
  handleValidationErrors
];

/**
 * Validation rules for creating account
 */
const createAccountValidation = [
  body('provider')
    .optional()
    .isIn(['baileys', 'default'])
    .withMessage('Invalid provider'),
  body('displayName')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('displayName must be a string (max 255 chars)'),
  body('phoneNumber')
    .optional()
    .isString()
    .isLength({ max: 20 })
    .withMessage('phoneNumber must be a string (max 20 chars)'),
  handleValidationErrors
];

/**
 * Validation rules for webhook configuration
 */
const webhookConfigValidation = [
  body('url').isURL().withMessage('url must be a valid URL'),
  body('events')
    .isArray()
    .withMessage('events must be an array')
    .custom((events) => {
      const validEvents = ['message.received', 'message.status', 'connection.update'];
      return events.every(e => validEvents.includes(e));
    })
    .withMessage('Invalid event types'),
  body('secret')
    .optional()
    .isString()
    .isLength({ min: 16 })
    .withMessage('secret must be at least 16 characters'),
  handleValidationErrors
];

/**
 * Validation rules for API key creation
 */
const createApiKeyValidation = [
  body('name')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('name must be a string (max 255 chars)'),
  handleValidationErrors
];

/**
 * Validation rules for ID parameters
 */
const idParamValidation = [
  param('id').isInt().toInt().withMessage('id must be a number'),
  handleValidationErrors
];

/**
 * Validation rules for pagination
 */
const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('offset must be a non-negative integer'),
  handleValidationErrors
];

module.exports = {
  sendMessageValidation,
  createAccountValidation,
  webhookConfigValidation,
  createApiKeyValidation,
  idParamValidation,
  paginationValidation,
  handleValidationErrors
};


const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/webhookController');
const { authMiddleware, baileysServiceMiddleware } = require('../../middlewares/apiKey');
const { workspaceContextMiddleware } = require('../../middlewares/oauth');
const { webhookConfigValidation } = require('../../middlewares/validator');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Provider service webhook endpoint (no auth required - comes from external service)
router.post('/provider', asyncHandler(webhookController.receiveBaileys.bind(webhookController)));
// Backward compatibility alias
router.post('/baileys', asyncHandler(webhookController.receiveBaileys.bind(webhookController)));

// Apply authentication and workspace context to other routes
router.use(authMiddleware);
router.use(workspaceContextMiddleware);

// Webhook configuration routes
router.post('/', webhookConfigValidation, asyncHandler(webhookController.configure.bind(webhookController)));
router.get('/', asyncHandler(webhookController.get.bind(webhookController)));
router.put('/', asyncHandler(webhookController.update.bind(webhookController)));
router.delete('/', asyncHandler(webhookController.delete.bind(webhookController)));
router.post('/test', asyncHandler(webhookController.test.bind(webhookController)));

module.exports = router;


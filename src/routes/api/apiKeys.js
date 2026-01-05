const express = require('express');
const router = express.Router();
const apiKeyController = require('../../controllers/apiKeyController');
const { oauthMiddleware, workspaceContextMiddleware } = require('../../middlewares/oauth');
const { createApiKeyValidation, idParamValidation } = require('../../middlewares/validator');
const { asyncHandler } = require('../../middlewares/errorHandler');

// API key management requires OAuth (not API key auth)
router.use(oauthMiddleware);
router.use(workspaceContextMiddleware);

// API key routes
router.post('/', createApiKeyValidation, asyncHandler(apiKeyController.create.bind(apiKeyController)));
router.get('/', asyncHandler(apiKeyController.list.bind(apiKeyController)));
router.post('/:id/revoke', idParamValidation, asyncHandler(apiKeyController.revoke.bind(apiKeyController)));
router.delete('/:id', idParamValidation, asyncHandler(apiKeyController.delete.bind(apiKeyController)));

module.exports = router;


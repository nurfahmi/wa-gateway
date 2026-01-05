const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');
const accountController = require('../../controllers/accountController');
const { asyncHandler } = require('../../middlewares/errorHandler');

// Public routes
router.get('/', asyncHandler(dashboardController.home.bind(dashboardController)));
router.get('/terms', asyncHandler(dashboardController.terms.bind(dashboardController)));

// File preview route (session-based auth, for images in <img> tags)
router.get('/files/:fileId/preview', asyncHandler(accountController.getFilePreview.bind(accountController)));

// Protected routes (session-based auth)
router.get('/dashboard', asyncHandler(dashboardController.dashboard.bind(dashboardController)));
router.get('/accounts', asyncHandler(dashboardController.accounts.bind(dashboardController)));
router.get('/accounts/connect', asyncHandler(dashboardController.connectAccount.bind(dashboardController)));
router.get('/messages', asyncHandler(dashboardController.messages.bind(dashboardController)));

// Device settings (AI & auto-reply configuration) - requires accountId
router.get('/accounts/:accountId/settings', asyncHandler(dashboardController.deviceSettings.bind(dashboardController)));

// API Documentation
router.get('/docs', asyncHandler(dashboardController.apiDocs.bind(dashboardController)));

module.exports = router;


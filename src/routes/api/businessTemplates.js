const express = require('express');
const router = express.Router();
const businessTemplateController = require('../../controllers/businessTemplateController');
const { authMiddleware } = require('../../middlewares/apiKey');
const { workspaceContextMiddleware } = require('../../middlewares/oauth');
const rateLimiter = require('../../middlewares/rateLimiter');
const { asyncHandler } = require('../../middlewares/errorHandler');

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

// Business template routes
router.get('/', asyncHandler(businessTemplateController.getAllTemplates));
router.get('/types', asyncHandler(businessTemplateController.getBusinessTypes));
router.get('/:businessType/:language?', asyncHandler(businessTemplateController.getTemplate));
router.put('/:businessType/:language', asyncHandler(businessTemplateController.upsertTemplate));
router.delete('/:businessType/:language', asyncHandler(businessTemplateController.deleteTemplate));

module.exports = router;

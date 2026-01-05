/**
 * DEV ONLY - Bypass OAuth for local testing
 * ⚠️ REMOVE THIS FILE IN PRODUCTION!
 */

const express = require('express');
const router = express.Router();
const WorkspaceUser = require('../../models/WorkspaceUser');
const Workspace = require('../../models/Workspace');
const config = require('../../config');
const logger = require('../../utils/logger');

// Only enable in development
if (config.app.env !== 'development') {
  logger.error('Dev auth routes are only available in development mode!');
  module.exports = router;
  return;
}

/**
 * DEV ONLY - Bypass OAuth login
 * Access: http://localhost:3000/dev-login
 */
router.get('/dev-login', async (req, res) => {
  try {
    // Create a test user ID
    const testUserId = 'dev_user_123';
    const testEmail = 'dev@example.com';
    const testName = 'Development User';

    // Find or create workspace
    let workspaceUser = await WorkspaceUser.findByOAuthId(testUserId);
    
    if (!workspaceUser) {
      logger.info('Creating dev workspace...');
      
      // Create workspace with enterprise tier for testing
      const workspace = await Workspace.create({
        name: 'Development Workspace',
        subscription_tier: 'enterprise',
        device_limit: 50,
        rate_limit_per_minute: 300
      });
      
      workspaceUser = await WorkspaceUser.create({
        workspace_id: workspace.id,
        oauth_user_id: testUserId,
        email: testEmail,
        full_name: testName,
        role: 'owner'
      });
    }
    
    // Create session
    req.session.accessToken = 'dev_token_' + Date.now();
    req.session.user = {
      id: testUserId,
      email: testEmail,
      name: testName
    };
    req.session.workspaceId = workspaceUser.workspace_id;
    
    logger.info('Dev login successful');
    
    res.redirect('/dashboard');
  } catch (error) {
    logger.error('Dev login error:', error);
    res.status(500).send('Dev login failed: ' + error.message);
  }
});

/**
 * List dev users
 */
router.get('/dev-users', async (req, res) => {
  try {
    const users = await WorkspaceUser.findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

logger.warn('⚠️  DEV AUTH ROUTES ENABLED - Remove in production!');

module.exports = router;


const WorkspaceUser = require('../models/WorkspaceUser');
const Workspace = require('../models/Workspace');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const MessageLog = require('../models/MessageLog');
const ApiKey = require('../models/ApiKey');
const autoReplyService = require('../services/autoReplyService');
const aiService = require('../services/aiService');
const templateService = require('../services/templateService');
const logger = require('../utils/logger');
const config = require('../config');
const axios = require('axios');

/**
 * Fetch devices from Baileys service to get API keys
 * @param {string} workspaceId - The workspace identifier (e.g., "workspace_3")
 */
async function fetchBaileysDevicesApiKeys(workspaceId) {
  try {
    const baileysUrl = config.baileys.serviceUrl || 'http://localhost:3000/api/whatsapp';
    const userId = `workspace_${workspaceId}`;
    
    const response = await axios.get(`${baileysUrl}/users/${userId}/devices`, {
      headers: {
        'X-API-Token': config.baileys.serviceApiKey || ''
      },
      timeout: 5000
    });
    
    if (response.data.devices) {
      // Create a map of sessionId -> apiKey
      const apiKeyMap = {};
      response.data.devices.forEach(device => {
        if (device.sessionId && device.apiKey) {
          apiKeyMap[device.sessionId] = device.apiKey;
        }
      });
      return apiKeyMap;
    }
    return {};
  } catch (error) {
    logger.warn('Failed to fetch Baileys devices for API keys:', error.message);
    return {};
  }
}

class DashboardController {
  /**
   * Render home/landing page
   */
  async home(req, res) {
    try {
      if (req.session.user) {
        return res.redirect('/dashboard');
      }

      // Get product name from config with original capitalization
      const productNamesRaw = (process.env.WHATSAPP_DEVICE_PRODUCT_NAMES || 'WhatsApp Device,WA Device,WhatsApp Gateway Device')
        .split(',')
        .map(name => name.trim());
      const productName = productNamesRaw.length > 0 ? productNamesRaw[0] : 'WhatsApp Device';
      const perDevicePrice = config.whatsappDevice.perDevicePrice;

      res.render('home', {
        title: `${productName} Gateway`,
        productName: productName,
        perDevicePrice: perDevicePrice
      });
    } catch (error) {
      logger.error('Home page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render terms and conditions page
   */
  async terms(req, res) {
    try {
      // Get product name from config with original capitalization
      const productNamesRaw = (process.env.WHATSAPP_DEVICE_PRODUCT_NAMES || 'WhatsApp Device,WA Device,WhatsApp Gateway Device')
        .split(',')
        .map(name => name.trim());
      const productName = productNamesRaw.length > 0 ? productNamesRaw[0] : 'WhatsApp Device';
      const perDevicePrice = config.whatsappDevice.perDevicePrice;

      res.render('terms', {
        title: `Terms and Conditions - ${productName} Gateway`,
        productName: productName,
        perDevicePrice: perDevicePrice
      });
    } catch (error) {
      logger.error('Terms page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render dashboard home
   */
  async dashboard(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      // Get workspace
      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);

      // Get stats
      const stats = await Workspace.getStats(workspace.id);
      const accounts = await WhatsAppAccount.findByWorkspace(workspace.id);
      const recentMessages = await MessageLog.findByWorkspace(workspace.id, { limit: 10, offset: 0 });

      res.render('dashboard/index', {
        title: 'Dashboard',
        user: req.session.user,
        workspace,
        stats,
        accounts,
        recentMessages: recentMessages.messages
      });
    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render accounts page
   */
  async accounts(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      const accounts = await WhatsAppAccount.findByWorkspace(workspace.id);

      // Fetch API keys from Baileys service using workspace ID
      const apiKeyMap = await fetchBaileysDevicesApiKeys(workspace.id);
      
      for (const account of accounts) {
        // Get device API key from Baileys service (matched by account_identifier which is sessionId)
        account.deviceApiKey = apiKeyMap[account.account_identifier] || null;
        
        // Fetch AI config and auto-reply rules for each account
        if (account.status === 'connected') {
          try {
            account.aiConfig = await aiService.getConfiguration(workspace.id, account.id);
            account.autoReplyRules = await autoReplyService.getRules(workspace.id, { accountId: account.id });
          } catch (error) {
            logger.warn(`Failed to fetch configs for account ${account.id}:`, error.message);
            account.aiConfig = null;
            account.autoReplyRules = [];
          }
        }
      }

      res.render('dashboard/accounts', {
        title: 'WhatsApp Accounts',
        user: req.session.user,
        workspace,
        accounts,
        accessToken: req.session.accessToken || ''
      });
    } catch (error) {
      logger.error('Accounts page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render account connection page
   */
  async connectAccount(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      
      // Check device limit - redirect to accounts page if limit reached
      const WhatsAppAccount = require('../models/WhatsAppAccount');
      const accountCount = await WhatsAppAccount.countByWorkspace(workspace.id);
      if (accountCount >= workspace.device_limit) {
        // Redirect to accounts page with limit_reached flag
        return res.redirect('/accounts?limit_reached=true');
      }

      res.render('accounts/connect', {
        title: 'Connect WhatsApp Account',
        user: req.session.user,
        workspace,
        accessToken: req.session.accessToken || ''
      });
    } catch (error) {
      logger.error('Connect account page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render messages page
   */
  async messages(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      const result = await MessageLog.findByWorkspace(workspace.id, { 
        limit: parseInt(req.query.limit) || 50, 
        offset: parseInt(req.query.offset) || 0 
      });

      res.render('dashboard/messages', {
        title: 'Messages',
        user: req.session.user,
        workspace,
        messages: result.messages,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      logger.error('Messages page error:', error);
      res.status(500).send('Server error');
    }
  }


  /**
   * Render device settings page (implicit - requires accountId)
   */
  async deviceSettings(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      if (!workspaceUser) {
        logger.error('WorkspaceUser not found for OAuth ID:', req.session.user.id);
        return res.redirect('/auth/login?error=workspace_not_found');
      }
      
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      if (!workspace) {
        logger.error('Workspace not found for ID:', workspaceUser.workspace_id);
        return res.redirect('/auth/login?error=workspace_not_found');
      }
      
      // Require accountId - redirect to accounts if not provided
      const accountId = req.params.accountId ? parseInt(req.params.accountId) : null;
      if (!accountId) {
        return res.redirect('/accounts');
      }
      
      // Get the specific account
      const accounts = await WhatsAppAccount.findByWorkspace(workspace.id);
      const account = accounts.find(a => a.id === accountId);
      
      if (!account) {
        return res.redirect('/accounts');
      }
      
      // Verify account belongs to this workspace
      if (account.workspace_id !== workspace.id) {
        return res.redirect('/accounts');
      }
      
      const rules = await autoReplyService.getRules(workspace.id, { accountId });

      // AI settings will be loaded via JavaScript API call after page load
      // This matches how the Baileys service settings page works
      const aiConfig = {};
      
      // Get Baileys service URL only (not the API key - keep that server-side)
      const baileysServiceUrl = config.baileys.serviceUrl || 'http://localhost:3000/api/whatsapp';
      
      res.render('dashboard/device-settings', {
        title: `Settings - ${account.display_name || 'Device'}`,
        user: req.session.user,
        workspace,
        account: {
          id: account.id,
          display_name: account.display_name || 'WhatsApp Device',
          phone_number: account.phone_number || 'Not available',
          status: account.status,
          provider: account.provider
        },
        rules,
        aiConfig: aiConfig || {},
        accessToken: req.session.accessToken || '',
        baileysServiceUrl: baileysServiceUrl
      });
    } catch (error) {
      logger.error('Device settings page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render templates page
   */
  async templates(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      const templates = await templateService.getTemplates(workspace.id);

      res.render('dashboard/templates', {
        title: 'Message Templates',
        user: req.session.user,
        workspace,
        templates
      });
    } catch (error) {
      logger.error('Templates page error:', error);
      res.status(500).send('Server error');
    }
  }

  /**
   * Render API documentation page
   */
  async apiDocs(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/auth/login');
      }

      const workspaceUser = await WorkspaceUser.findByOAuthId(req.session.user.id);
      const workspace = await Workspace.findById(workspaceUser.workspace_id);
      const accounts = await WhatsAppAccount.findByWorkspace(workspace.id);
      
      // Fetch API keys from Baileys service using workspace ID
      const apiKeyMap = await fetchBaileysDevicesApiKeys(workspace.id);
      
      // Get device API keys for display
      const devicesWithKeys = [];
      for (const account of accounts) {
        if (account.status === 'connected') {
          devicesWithKeys.push({
            id: account.id,
            name: account.display_name || 'Unnamed Device',
            phoneNumber: account.phone_number || 'Not available',
            apiKey: apiKeyMap[account.account_identifier] || null
          });
        }
      }
      
      // Get the base URL for API examples
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.render('dashboard/api-docs', {
        title: 'API Documentation',
        user: req.session.user,
        workspace,
        devices: devicesWithKeys,
        baseUrl: baseUrl
      });
    } catch (error) {
      logger.error('API docs page error:', error);
      res.status(500).send('Server error');
    }
  }
}

module.exports = new DashboardController();


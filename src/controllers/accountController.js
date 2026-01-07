const accountService = require('../services/accountService');
const autoReplyService = require('../services/autoReplyService');
const eventHandlerService = require('../services/eventHandlerService');
const response = require('../utils/response');
const qrCode = require('../utils/qrCode');
const logger = require('../utils/logger');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const ProviderFactory = require('../providers/factory');

class AccountController {
  /**
   * Create new WhatsApp account
   */
  async create(req, res) {
    try {
      // Accept 'default' as alias for 'baileys' (internal provider name)
      let { provider = 'baileys', displayName, phoneNumber } = req.body;
      if (provider === 'default') provider = 'baileys';

      const account = await accountService.createAccount(req.workspace.id, {
        provider,
        displayName,
        phoneNumber
      });

      // Setup event listeners
      await accountService.setupEventListeners(account.id, (event) => {
        eventHandlerService.handleEvent(event);
      });

      // Prepare response
      const responseData = {
        id: account.id,
        provider: account.provider,
        status: account.status,
        displayName: account.display_name,
        phoneNumber: account.phone_number,
        createdAt: account.created_at
      };

      // Note: Device API keys are managed by the messaging service, not stored in our database
      // API keys are returned by the service when initializing a device

      // Include QR code if available
      if (account.qr_code) {
        responseData.qrCode = await qrCode.generateQRDataURL(account.qr_code);
        responseData.qrExpiresAt = account.qr_expires_at;
      }

      return response.success(res, responseData, 'Account created successfully', 201);
    } catch (error) {
      logger.error('Account creation error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * List all accounts for workspace
   */
  async list(req, res) {
    try {
      const { status, provider } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (provider) filters.provider = provider;

      const accounts = await accountService.getWorkspaceAccounts(req.workspace.id, filters);

      return response.success(res, accounts);
    } catch (error) {
      logger.error('Account list error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Get account details
   */
  async get(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);

      return response.success(res, account);
    } catch (error) {
      logger.error('Get account error:', error);
      return response.notFound(res, 'Account');
    }
  }

  /**
   * Get account QR code
   */
  async getQR(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const qr = await accountService.getQRCode(accountId, req.workspace.id);

      if (!qr) {
        // Return success but with null QR - means it's not ready yet
        return response.success(res, { 
          qrCode: null,
          message: 'QR code not ready yet, please wait...'
        });
      }

      const qrDataUrl = await qrCode.generateQRDataURL(qr);

      return response.success(res, { qrCode: qrDataUrl });
    } catch (error) {
      logger.error('Get QR error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get account status
   */
  async getStatus(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const status = await accountService.getAccountStatus(accountId, req.workspace.id);

      return response.success(res, status);
    } catch (error) {
      logger.error('Get status error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Delete account
   */
  async delete(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      await accountService.deleteAccount(accountId, req.workspace.id);

      return response.success(res, null, 'Account deleted successfully');
    } catch (error) {
      logger.error('Delete account error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get device API key (view full key)
   */
  async getDeviceKey(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);

      if (!account) {
        return response.notFound(res, 'Account not found');
      }

      // Device API keys are managed by the messaging service, not stored in our database
      // To get the device API key, check the service response when initializing the device
      return response.error(res, 'Device API keys are managed by the messaging service. Check your dashboard for API key retrieval.', 400);
    } catch (error) {
      logger.error('Get device key error:', error);
      return response.error(res, error.message, 400);
    }
  }


  /**
   * Get contacts from WhatsApp
   */
  async getContacts(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const contacts = await accountService.getContacts(accountId, req.workspace.id);

      return response.success(res, { contacts });
    } catch (error) {
      logger.error('Get contacts error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Logout device (disconnect but keep account)
   */
  async logout(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);
      
      if (!account || account.status === 'disconnected') {
        // Already disconnected, just update status
        await WhatsAppAccount.updateStatus(accountId, 'disconnected');
        return response.success(res, { message: 'Device already disconnected' });
      }

      // Disconnect from Baileys service
      const provider = ProviderFactory.create(account.provider);
      await provider.disconnect(account.account_identifier);
      
      // Update status to disconnected
      await WhatsAppAccount.updateStatus(accountId, 'disconnected');
      
      logger.info(`Logged out account ${accountId}`);
      return response.success(res, { message: 'Device logged out successfully' });
    } catch (error) {
      logger.error('Logout error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Reconnect device (logout then login to get new QR)
   */
  async reconnect(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);
      
      const provider = ProviderFactory.create(account.provider);
      
      // Logout first
      try {
        await provider.disconnect(account.account_identifier);
      } catch (error) {
        // Logout might fail if already disconnected, that's okay
        logger.warn(`Logout warning during reconnect: ${error.message}`);
      }
      
      // Update status to connecting
      await WhatsAppAccount.updateStatus(accountId, 'connecting');
      
      // Clear old QR code
      await WhatsAppAccount.updateQR(accountId, null, null);
      
      // Call login endpoint to trigger QR code generation
      try {
        await provider.login(account.account_identifier);
        logger.info(`Login initiated for account ${accountId}, QR code will be available shortly`);
      } catch (error) {
        logger.error(`Login error during reconnect for account ${accountId}:`, error.message);
        // Don't fail the request, QR might still be generated via webhook
      }
      
      logger.info(`Reconnecting account ${accountId}`);
      return response.success(res, { message: 'Device reconnecting. QR code will be available shortly.' });
    } catch (error) {
      logger.error('Reconnect error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get business templates from Baileys service
   */
  async getBusinessTemplates(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);
      const businessType = req.query.type || req.query.businessType || null;
      const language = req.query.language || null;

      if (!businessType) {
        return response.error(res, 'Business type is required', 400);
      }

      const provider = ProviderFactory.create(account.provider);
      const templates = await provider.getBusinessTemplates(account.account_identifier, businessType, language);

      return response.success(res, templates);
    } catch (error) {
      logger.error('Get business templates error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Update business configuration
   */
  async updateBusinessConfig(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);

      const provider = ProviderFactory.create(account.provider);
      const result = await provider.updateBusinessConfig(account.account_identifier, req.body);

      logger.info(`Business config updated for account ${accountId}`);
      return response.success(res, result, 'Business configuration updated successfully');
    } catch (error) {
      logger.error('Update business config error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get AI settings for an account
   */
  async getAISettings(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);
      
      if (account.status !== 'connected') {
        return response.success(res, {
          is_enabled: false,
          auto_reply_enabled: false,
          product_knowledge: { items: [], otherDescription: "" },
          sales_scripts: { items: [], detailedResponse: "" }
        });
      }

      const providerFactory = require('../providers/factory');
      const provider = providerFactory.create(account.provider);
      
      if (!provider.getAISettings) {
        return response.error(res, 'Provider does not support AI settings', 400);
      }

      const baileysResponse = await provider.getAISettings(account.account_identifier);
      const baileysSettings = baileysResponse.settings || baileysResponse;

      // Map Baileys format to our format
      const handleStructuredData = (value) => {
        if (!value) return { items: [], otherDescription: "" };
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return parsed.items ? parsed : { items: [], otherDescription: parsed };
          } catch (e) {
            return { items: [], otherDescription: value };
          }
        }
        if (typeof value === 'object') {
          return value.items ? value : { items: [], otherDescription: value.otherDescription || "" };
        }
        return { items: [], otherDescription: "" };
      };

      // Get temperature and max_tokens from .env (global configuration)
      const config = require('../config');
      const defaultTemperature = config.ai.defaultTemperature || 0.7;
      const defaultMaxTokens = config.ai.defaultMaxTokens || 500;

      const aiSettings = {
        is_enabled: baileysSettings.aiEnabled || false,
        auto_reply_enabled: baileysSettings.aiAutoReply || false,
        bot_name: baileysSettings.aiBotName || 'Assistant',
        language: baileysSettings.aiLanguage || 'en',
        system_prompt: baileysSettings.aiPromptTemplate || baileysSettings.system_prompt || '',
        trigger_word: baileysSettings.aiTriggers && baileysSettings.aiTriggers.length > 0 
          ? baileysSettings.aiTriggers[0] 
          : '',
        temperature: defaultTemperature, // From .env
        max_tokens: defaultMaxTokens, // From .env
        conversation_memory_enabled: baileysSettings.conversationMemoryEnabled !== false,
        require_trigger: baileysSettings.requireTrigger || false,
        ai_rule: baileysSettings.aiRule || '',
        // Business config fields
        business_type: baileysSettings.businessType || '',
        product_knowledge: handleStructuredData(baileysSettings.productKnowledge),
        sales_scripts: handleStructuredData(baileysSettings.salesScripts),
        upsell_strategies: baileysSettings.upsellStrategies || '',
        objection_handling: baileysSettings.objectionHandling || '',
        template_language: baileysSettings.templateLanguage || 'en'
      };

      return response.success(res, aiSettings);
    } catch (error) {
      logger.error('Get AI settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Configure AI auto-reply settings
   */
  async configureAI(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const {
        is_enabled,
        auto_reply_enabled,
        require_trigger,
        conversation_memory_enabled,
        bot_name,
        language,
        system_prompt,
        trigger_word,
        ai_rule
      } = req.body;

      // Save directly to Baileys service (source of truth)
      const account = await accountService.getAccount(accountId, req.workspace.id);
      if (account.status !== 'connected') {
        return response.error(res, 'Account must be connected to configure AI', 400);
      }

      const providerFactory = require('../providers/factory');
      const provider = providerFactory.create(account.provider);
      
      if (!provider.configureAI) {
        return response.error(res, 'Provider does not support AI configuration', 400);
      }

      // Get temperature and max_tokens from .env (global configuration)
      const config = require('../config');
      const temperature = config.ai.defaultTemperature || 0.7;
      const maxTokens = config.ai.defaultMaxTokens || 500;

      // Map form data to Baileys service format
      const baileysSettings = {
        aiEnabled: is_enabled !== undefined ? is_enabled : false,
        aiAutoReply: auto_reply_enabled !== undefined ? auto_reply_enabled : false,
        aiBotName: bot_name || 'Assistant',
        aiMaxTokens: maxTokens,
        aiTemperature: temperature,
        aiLanguage: language || 'en',
        aiPromptTemplate: system_prompt || '',
        aiTriggers: trigger_word ? [trigger_word] : [],
        conversationMemoryEnabled: conversation_memory_enabled !== undefined ? conversation_memory_enabled : true,
        requireTrigger: require_trigger !== undefined ? require_trigger : false
      };

      const result = await provider.configureAI(account.account_identifier, baileysSettings);

      return response.success(res, result, 'AI settings saved successfully');
    } catch (error) {
      logger.error('Configure AI error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Sync auto-reply rules to Baileys service
   */
  async syncAutoReplyRules(req, res) {
    try {
      const accountId = parseInt(req.params.id);
      const account = await accountService.getAccount(accountId, req.workspace.id);
      
      if (!account || account.status !== 'connected') {
        return response.error(res, 'Account not found or not connected', 400);
      }

      await autoReplyService.syncRulesToBaileys(accountId);
      return response.success(res, { message: 'Auto-reply rules synced successfully' });
    } catch (error) {
      logger.error('Sync auto-reply rules error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Upload file
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return response.error(res, 'No file uploaded', 400);
      }

      const { fileType } = req.body;
      const result = await accountService.uploadFile(
        req.workspace.id,
        req.file.buffer,
        req.file.originalname,
        fileType || req.file.mimetype
      );

      return response.success(res, result, 'File uploaded successfully');
    } catch (error) {
      logger.error('Upload file error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(req, res) {
    try {
      const { fileId } = req.params;
      const fileInfo = await accountService.getFileInfo(fileId);

      if (!fileInfo) {
        return response.notFound(res, 'File');
      }

      return response.success(res, fileInfo);
    } catch (error) {
      logger.error('Get file info error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Proxy file preview from Baileys service (to avoid CORS issues)
   * Allow public access for file previews (files have unique IDs that act as tokens)
   */
  async getFilePreview(req, res) {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).send('File ID required');
      }
      
      const config = require('../config');
      const axios = require('axios');
      
      const baileysServiceUrl = config.baileys.serviceUrl || 'http://localhost:3000/api/whatsapp';
      const baileysApiKey = config.baileys.serviceApiKey || '';
      
      // Try multiple endpoints in order of preference
      const endpoints = [
        `${baileysServiceUrl}/files/${fileId}/download`,  // Download endpoint (binary)
        `${baileysServiceUrl}/files/${fileId}/content`,   // Content endpoint
        `${baileysServiceUrl}/files/${fileId}/stream`,    // Stream endpoint
      ];
      
      let lastError = null;
      
      for (const downloadUrl of endpoints) {
        try {
          logger.debug(`Trying file download from: ${downloadUrl}`);
          
          const response = await axios.get(downloadUrl, {
            headers: {
              'X-API-Token': baileysApiKey,
              'Accept': 'image/*,*/*'
            },
            responseType: 'stream',
            timeout: 30000,
            validateStatus: (status) => status < 500 // Accept 4xx to handle them
          });
          
          // Check if we got actual binary content (not JSON)
          const contentType = response.headers['content-type'] || '';
          
          if (response.status === 200 && !contentType.includes('application/json')) {
            // Success - got binary content
            res.setHeader('Content-Type', contentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            if (response.headers['content-length']) {
              res.setHeader('Content-Length', response.headers['content-length']);
            }
            
            response.data.pipe(res);
            return;
          }
        } catch (err) {
          lastError = err;
          logger.debug(`Endpoint ${downloadUrl} failed: ${err.message}`);
        }
      }
      
      // If all stream endpoints failed, try to get file info and redirect
      try {
        const infoUrl = `${baileysServiceUrl}/files/${fileId}`;
        const infoResponse = await axios.get(infoUrl, {
          headers: { 'X-API-Token': baileysApiKey },
          timeout: 10000
        });
        
        const fileInfo = infoResponse.data?.file || infoResponse.data?.data || infoResponse.data;
        
        // If file has a direct URL, redirect to it
        if (fileInfo?.url || fileInfo?.downloadUrl || fileInfo?.previewUrl) {
          const directUrl = fileInfo.url || fileInfo.downloadUrl || fileInfo.previewUrl;
          logger.debug(`Redirecting to direct URL: ${directUrl}`);
          return res.redirect(directUrl);
        }
        
        // If file has base64 data, serve it
        if (fileInfo?.data || fileInfo?.base64) {
          const base64Data = fileInfo.data || fileInfo.base64;
          const mimeType = fileInfo.mimeType || fileInfo.mimetype || 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          return res.send(buffer);
        }
      } catch (infoErr) {
        logger.debug(`File info request failed: ${infoErr.message}`);
      }
      
      // All attempts failed
      logger.error('Get file preview - all endpoints failed:', {
        fileId,
        lastError: lastError?.message
      });
      
      res.status(404).send('Image not found');
    } catch (error) {
      logger.error('Get file preview error:', {
        fileId: req.params?.fileId,
        message: error.message,
        status: error.response?.status
      });
      res.status(error.response?.status || 500).send('Failed to load image');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const deleted = await accountService.deleteFile(fileId);

      if (!deleted) {
        return response.error(res, 'Failed to delete file', 400);
      }

      return response.success(res, null, 'File deleted successfully');
    } catch (error) {
      logger.error('Delete file error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Login device (get QR code for reconnection)
   */
  async login(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      const provider = ProviderFactory.create(account.provider);
      const result = await provider.login(account.account_identifier);

      // If login returns QR, update it
      if (result && result.qr) {
        await WhatsAppAccount.updateQR(
          account.id,
          result.qr,
          new Date(Date.now() + 60000) // QR expires in 60 seconds
        );
      }

      return response.success(res, result, 'Device login initiated');
    } catch (error) {
      logger.error('Device login error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Logout device
   */
  async logout(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      const provider = ProviderFactory.create(account.provider);
      await provider.disconnect(account.account_identifier);

      // Update account status
      await WhatsAppAccount.updateStatus(account.id, 'disconnected');

      return response.success(res, null, 'Device logged out successfully');
    } catch (error) {
      logger.error('Device logout error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Cancel session
   */
  async cancelSession(req, res) {
    try {
      const { sessionId } = req.params;

      // Find account by session identifier
      const account = await WhatsAppAccount.findByIdentifier(sessionId);
      if (!account) {
        return response.notFound(res, 'Session');
      }

      // Check workspace access
      if (account.workspace_id !== req.workspace.id) {
        return response.forbidden(res, 'Access denied');
      }

      const provider = ProviderFactory.create(account.provider);

      // Try to cancel the session
      try {
        // Note: Baileys may not have a direct cancel method, but we can disconnect
        await provider.disconnect(sessionId);
        await WhatsAppAccount.updateStatus(account.id, 'disconnected');
      } catch (cancelError) {
        logger.warn(`Could not cancel session ${sessionId}:`, cancelError.message);
        // Still return success as the session is effectively cancelled
      }

      return response.success(res, null, 'Session cancelled successfully');
    } catch (error) {
      logger.error('Cancel session error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get chats for device
   */
  async getChats(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      if (account.status !== 'connected') {
        return response.error(res, 'Account must be connected to get chats', 400);
      }

      const provider = ProviderFactory.create(account.provider);
      const chats = await provider.getChats(account.account_identifier);

      return response.success(res, { chats }, 'Chats retrieved successfully');
    } catch (error) {
      logger.error('Get chats error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get groups for device
   */
  async getGroups(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      if (account.status !== 'connected') {
        return response.error(res, 'Account must be connected to get groups', 400);
      }

      const provider = ProviderFactory.create(account.provider);
      const groups = await provider.getGroups(account.account_identifier);

      return response.success(res, { groups }, 'Groups retrieved successfully');
    } catch (error) {
      logger.error('Get groups error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get webhook settings for device
   */
  async getWebhookSettings(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      const provider = ProviderFactory.create(account.provider);
      const settings = await provider.getWebhookSettings(account.account_identifier);

      return response.success(res, settings, 'Webhook settings retrieved successfully');
    } catch (error) {
      logger.error('Get webhook settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Update webhook settings for device
   */
  async updateWebhookSettings(req, res) {
    try {
      const { id } = req.params;
      const settings = req.body;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);
      const provider = ProviderFactory.create(account.provider);

      const updatedSettings = await provider.updateWebhookSettings(account.account_identifier, settings);

      return response.success(res, updatedSettings, 'Webhook settings updated successfully');
    } catch (error) {
      logger.error('Update webhook settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get all chat settings for device
   */
  async getAllChatSettings(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation - in real app, fetch from database
      const chats = [
        {
          id: 1,
          deviceId: parseInt(id),
          chatId: '628123456789@s.whatsapp.net',
          phoneNumber: '628123456789',
          contactName: 'John Doe',
          aiEnabled: true,
          customerSegment: 'vip',
          notes: 'Premium customer',
          lastMessageContent: 'Hello',
          lastMessageTimestamp: '2024-01-15T10:30:00Z',
          totalIncomingMessages: 50,
          totalOutgoingMessages: 45
        }
      ];

      const paginatedChats = chats.slice(offset, offset + limit);

      return response.success(res, {
        chats: paginatedChats,
        total: chats.length,
        device: {
          id: parseInt(id),
          alias: account.display_name || `account_${id}`
        }
      }, 'Chat settings retrieved successfully');
    } catch (error) {
      logger.error('Get all chat settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get chat settings summary
   */
  async getChatSettingsSummary(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const summary = [
        { segment: 'vip', count: 5, aiEnabled: 5 },
        { segment: 'regular', count: 20, aiEnabled: 10 }
      ];

      const stats = {
        totalActiveChats: 25,
        aiEnabledChats: 15,
        totalIncoming: 500,
        totalOutgoing: 450
      };

      return response.success(res, { summary, stats }, 'Chat settings summary retrieved successfully');
    } catch (error) {
      logger.error('Get chat settings summary error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get specific chat settings
   */
  async getChatSettings(req, res) {
    try {
      const { id, phoneNumber } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const chat = {
        id: 1,
        deviceId: parseInt(id),
        chatId: `${phoneNumber}@s.whatsapp.net`,
        phoneNumber: phoneNumber,
        contactName: 'John Doe',
        aiEnabled: true,
        customerSegment: 'vip',
        notes: 'Premium customer - prioritize',
        lastMessageContent: 'Hello',
        lastMessageTimestamp: '2024-01-15T10:30:00Z'
      };

      return response.success(res, { chat }, 'Chat settings retrieved successfully');
    } catch (error) {
      logger.error('Get chat settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Update chat settings
   */
  async updateChatSettings(req, res) {
    try {
      const { id, phoneNumber } = req.params;
      const settings = req.body;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation - update in database
      const updatedChat = {
        id: 1,
        deviceId: parseInt(id),
        chatId: `${phoneNumber}@s.whatsapp.net`,
        phoneNumber: phoneNumber,
        contactName: settings.contactName || 'John Doe',
        aiEnabled: settings.aiEnabled !== false,
        customerSegment: settings.customerSegment || 'regular',
        notes: settings.notes || ''
      };

      return response.success(res, { chat: updatedChat }, 'Chat settings updated successfully');
    } catch (error) {
      logger.error('Update chat settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Bulk update chat settings
   */
  async bulkUpdateChatSettings(req, res) {
    try {
      const { id } = req.params;
      const { phoneNumbers, settings } = req.body;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const updatedCount = phoneNumbers.length;

      return response.success(res, { updatedCount }, `${updatedCount} chats updated successfully`);
    } catch (error) {
      logger.error('Bulk update chat settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get chat conversation history
   */
  async getChatConversation(req, res) {
    try {
      const { id, phoneNumber } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const conversation = [
        {
          id: 1,
          content: 'Hello',
          role: 'user',
          timestamp: '2024-01-15T10:30:00Z',
          source: 'ai_memory',
          direction: 'incoming'
        },
        {
          id: 2,
          content: 'Hi! How can I help you?',
          role: 'assistant',
          timestamp: '2024-01-15T10:30:05Z',
          source: 'ai_memory',
          direction: 'outgoing'
        }
      ];

      const paginatedConversation = conversation.slice(offset, offset + limit);

      return response.success(res, {
        chat: {
          phoneNumber: phoneNumber,
          chatId: `${phoneNumber}@s.whatsapp.net`,
          contactName: 'John Doe',
          deviceId: parseInt(id),
          sessionId: account.account_identifier
        },
        conversation: paginatedConversation,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: conversation.length,
          hasMore: false
        },
        source: 'ai_memory'
      }, 'Chat conversation retrieved successfully');
    } catch (error) {
      logger.error('Get chat conversation error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get chat statistics
   */
  async getChatStats(req, res) {
    try {
      const { id, phoneNumber } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const chat = {
        phoneNumber: phoneNumber,
        chatId: `${phoneNumber}@s.whatsapp.net`,
        contactName: 'John Doe',
        aiEnabled: true,
        lastMessageContent: 'Hello',
        lastMessageTimestamp: '2024-01-15T10:30:00Z'
      };

      const stats = {
        totalMessages: 50,
        aiMessages: 25,
        userMessages: 25,
        firstMessageDate: '2024-01-10T08:00:00Z',
        lastMessageDate: '2024-01-15T10:30:00Z',
        averageResponseTime: null
      };

      return response.success(res, { chat, stats }, 'Chat statistics retrieved successfully');
    } catch (error) {
      logger.error('Get chat stats error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Update conversation memory settings
   */
  async updateMemorySettings(req, res) {
    try {
      const { id, chatId } = req.params;
      const { memoryRetentionHours, maxHistoryMessages } = req.body;

      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const data = {
        chatId: chatId,
        phoneNumber: chatId.replace('@s.whatsapp.net', ''),
        memoryRetentionHours: memoryRetentionHours || 72,
        maxHistoryMessages: maxHistoryMessages || 30
      };

      return response.success(res, { data }, 'Memory settings updated successfully');
    } catch (error) {
      logger.error('Update memory settings error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Clear conversation memory
   */
  async clearConversationMemory(req, res) {
    try {
      const { id, chatId } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      // Mock implementation
      const deletedEntries = 50;

      const data = {
        chatId: chatId,
        deletedEntries: deletedEntries
      };

      return response.success(res, { data }, `Cleared ${deletedEntries} conversation memory entries`);
    } catch (error) {
      logger.error('Clear conversation memory error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get device information from Baileys
   */
  async getDeviceInfo(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      const provider = ProviderFactory.create(account.provider);
      const deviceInfo = await provider.getDeviceInfo(account.account_identifier);

      return response.success(res, { device: deviceInfo }, 'Device info retrieved successfully');
    } catch (error) {
      logger.error('Get device info error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Sync device API key from Baileys (for devices that were initialized before key storage)
   */
  async syncDeviceApiKey(req, res) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccount(parseInt(id), req.workspace.id);

      if (!account.external_device_id) {
        return response.error(res, 'Device not connected to service', 400);
      }

      const provider = ProviderFactory.create(account.provider);

      try {
        // Try to get device info which might contain the API key
        const deviceInfo = await provider.getDeviceInfo(account.account_identifier);

        if (deviceInfo && deviceInfo.apiKey) {
          // Device API keys are managed by the messaging service, not stored in our database
          // API keys are validated directly with the service when used
          return response.success(res, {
            apiKey: deviceInfo.apiKey.substring(0, 20) + '...',
            message: 'Device API key is managed by the messaging service.'
          }, 'Device API key info retrieved');
        } else {
          return response.error(res, 'API key not found in device info', 404);
        }
      } catch (deviceInfoError) {
        logger.warn('Could not get device info:', deviceInfoError.message);
        return response.error(res, 'Could not retrieve device info', 400);
      }
    } catch (error) {
      logger.error('Sync device API key error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Test AI response
   */
  async testAI(req, res) {
    try {
      const { deviceId, message, aiSettings } = req.body;

      // Validate required fields
      if (!deviceId || !message) {
        return response.error(res, 'deviceId and message are required', 400);
      }

      const account = await accountService.getAccount(parseInt(deviceId), req.workspace.id);

      if (account.status !== 'connected') {
        return response.error(res, 'Device must be connected to test AI', 400);
      }

      // Mock AI response - in real implementation, call AI service
      const aiResponse = `Hello! This is a mock AI response to: "${message}". I'm configured as an assistant for ${aiSettings?.businessType || 'general'} business.`;

      return response.success(res, {
        success: true,
        response: aiResponse,
        settings: {
          botName: aiSettings?.aiBotName || 'Assistant',
          temperature: aiSettings?.aiTemperature || 0.7,
          maxTokens: aiSettings?.aiMaxTokens || 500,
          language: aiSettings?.aiLanguage || 'en'
        }
      }, 'AI response generated successfully');
    } catch (error) {
      logger.error('Test AI error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get available AI providers
   */
  async getAIProviders(req, res) {
    try {
      // Mock implementation - in real app, get from AI service configuration
      const providers = [
        {
          id: 'openai',
          name: 'OpenAI',
          enabled: true,
          apiKeyConfigured: true,
          models: [
            {
              id: 'gpt-3.5-turbo',
              name: 'GPT-3.5 Turbo',
              pricing: {
                input: '$0.001500/1K tokens',
                output: '$0.002000/1K tokens'
              },
              maxTokens: 4096,
              contextWindow: 16385,
              capabilities: ['chat', 'completion'],
              recommended: true,
              isDefault: true
            }
          ],
          defaultModel: 'gpt-3.5-turbo'
        }
      ];

      return response.success(res, { providers }, 'AI providers retrieved successfully');
    } catch (error) {
      logger.error('Get AI providers error:', error);
      return response.error(res, error.message, 500);
    }
  }
}

module.exports = new AccountController();


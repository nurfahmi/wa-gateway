const messageService = require('../services/messageService');
const response = require('../utils/response');
const logger = require('../utils/logger');
const WhatsAppAccount = require('../models/WhatsAppAccount');

class MessageController {
  /**
   * Helper method to resolve accountId from sessionId or accountId
   */
  async _resolveAccountId(req) {
    // Check if authenticated via device API key
    if (req.deviceApiKey) {
      return {
        accountId: req.deviceApiKey.accountId,
        workspaceId: req.deviceApiKey.workspaceId
      };
    }

    // Workspace API key or OAuth authentication
    const workspaceId = req.workspace.id;
    const { sessionId, accountId: bodyAccountId } = req.body;

    let accountId;

    if (sessionId) {
      // Find account by sessionId (account_identifier)
      const account = await WhatsAppAccount.findByIdentifier(sessionId);
      if (!account) {
        throw new Error(`Account with sessionId '${sessionId}' not found`);
      }
      accountId = account.id;
    } else if (bodyAccountId) {
      // Use accountId directly
      accountId = bodyAccountId;
    } else {
      throw new Error('Either sessionId or accountId is required when using workspace API key');
    }

    return { accountId, workspaceId };
  }

  /**
   * Send message
   */
  async send(req, res) {
    try {
      const { accountId, workspaceId } = await this._resolveAccountId(req);

      const { recipient, message, type = 'text', content } = req.body;

      // Support both 'message' and 'content' parameters for backward compatibility
      const finalContent = content || (message ? { text: message } : null);

      if (!finalContent && type === 'text') {
        return response.error(res, 'Message content is required', 400);
      }

      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient,
        type,
        content: finalContent
      });

      return response.success(res, result, 'Message sent successfully');
    } catch (error) {
      logger.error('Send message error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Send image message
   */
  async sendImage(req, res) {
    try {
      const { accountId, workspaceId } = await this._resolveAccountId(req);

      const { recipient, fileId, caption } = req.body;

      if (!recipient) {
        return response.error(res, 'recipient is required', 400);
      }

      if (!fileId && !req.file) {
        return response.error(res, 'Either fileId or file upload is required', 400);
      }

      let fileData;
      if (req.file) {
        // Handle file upload
        const accountService = require('../services/accountService');
        const uploadResult = await accountService.uploadFile(workspaceId, req.file.buffer, req.file.originalname, 'image');
        fileData = uploadResult; // Contains { fileId, url, fileName, etc. }
      } else {
        // Get file info from Baileys service
        const accountService = require('../services/accountService');
        const fileInfo = await accountService.getFileInfo(fileId);
        fileData = fileInfo;
      }

      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient,
        type: 'image',
        content: {
          url: fileData.url,
          caption: caption || '',
          fileName: fileData.fileName
        }
      });

      return response.success(res, result, 'Image sent successfully');
    } catch (error) {
      logger.error('Send image error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Send video message
   */
  async sendVideo(req, res) {
    try {
      const { accountId, workspaceId } = await this._resolveAccountId(req);

      const { recipient, fileId, caption } = req.body;

      if (!recipient) {
        return response.error(res, 'recipient is required', 400);
      }

      if (!fileId && !req.file) {
        return response.error(res, 'Either fileId or file upload is required', 400);
      }

      let fileData;
      if (req.file) {
        const accountService = require('../services/accountService');
        const uploadResult = await accountService.uploadFile(workspaceId, req.file.buffer, req.file.originalname, 'video');
        fileData = uploadResult;
      } else {
        const accountService = require('../services/accountService');
        const fileInfo = await accountService.getFileInfo(fileId);
        fileData = fileInfo;
      }

      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient,
        type: 'video',
        content: {
          url: fileData.url,
          caption: caption || '',
          fileName: fileData.fileName
        }
      });

      return response.success(res, result, 'Video sent successfully');
    } catch (error) {
      logger.error('Send video error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Send document message
   */
  async sendDocument(req, res) {
    try {
      const { accountId, workspaceId } = await this._resolveAccountId(req);

      const { recipient, fileId, fileName } = req.body;

      if (!recipient) {
        return response.error(res, 'recipient is required', 400);
      }

      if (!fileId && !req.file) {
        return response.error(res, 'Either fileId or file upload is required', 400);
      }

      let fileData;
      if (req.file) {
        const accountService = require('../services/accountService');
        const uploadResult = await accountService.uploadFile(workspaceId, req.file.buffer, req.file.originalname, 'document');
        fileData = uploadResult;
      } else {
        const accountService = require('../services/accountService');
        const fileInfo = await accountService.getFileInfo(fileId);
        fileData = fileInfo;
      }

      const result = await messageService.sendMessage(workspaceId, {
        accountId,
        recipient,
        type: 'document',
        content: {
          url: fileData.url,
          fileName: fileName || fileData.fileName || 'document'
        }
      });

      return response.success(res, result, 'Document sent successfully');
    } catch (error) {
      logger.error('Send document error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * List messages
   */
  async list(req, res) {
    try {
      const { accountId, direction, status, limit = 50, offset = 0 } = req.query;

      const options = {
        accountId: accountId ? parseInt(accountId) : undefined,
        direction,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const result = await messageService.getMessages(req.workspace.id, options);

      return response.paginated(res, result.messages, {
        total: result.total,
        page: Math.floor(offset / limit) + 1,
        limit: result.limit
      });
    } catch (error) {
      logger.error('List messages error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Get message details
   */
  async get(req, res) {
    try {
      const messageId = parseInt(req.params.id);
      const message = await messageService.getMessage(messageId, req.workspace.id);

      return response.success(res, message);
    } catch (error) {
      logger.error('Get message error:', error);
      return response.notFound(res, 'Message');
    }
  }

  /**
   * Get message statistics
   */
  async getStats(req, res) {
    try {
      const { accountId, days = 7 } = req.query;

      const stats = await messageService.getStats(
        req.workspace.id,
        accountId ? parseInt(accountId) : null,
        parseInt(days)
      );

      return response.success(res, stats);
    } catch (error) {
      logger.error('Get stats error:', error);
      return response.error(res, error.message, 500);
    }
  }
}

module.exports = new MessageController();


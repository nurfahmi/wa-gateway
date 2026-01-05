const MessageLog = require('../models/MessageLog');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const ProviderFactory = require('../providers/factory');
const logger = require('../utils/logger');

class MessageService {
  /**
   * Send text message
   */
  async sendMessage(workspaceId, data) {
    const { accountId, recipient, type, content } = data;

    // Get account
    const account = await WhatsAppAccount.findById(accountId);
    
    if (!account || account.workspace_id !== workspaceId) {
      throw new Error('Account not found');
    }

    if (account.status !== 'connected') {
      throw new Error(`Account is not connected. Current status: ${account.status}. Please reconnect your WhatsApp account before sending messages.`);
    }

    // Get provider
    const provider = ProviderFactory.create(account.provider);

    // Note: Skip real-time status check for performance optimization
    // Baileys service will return an error if disconnected anyway

    let result;
    
    try {
      // Send based on type
      if (type === 'text') {
        result = await provider.sendText(account.account_identifier, recipient, content.text);
      } else {
        // Media message
        result = await provider.sendMedia(account.account_identifier, recipient, {
          type,
          url: content.mediaUrl,
          caption: content.caption,
          fileName: content.fileName,
          mimeType: content.mimeType
        });
      }

      // Log message
      const messageLog = await MessageLog.create({
        workspace_id: workspaceId,
        account_id: accountId,
        message_id: result.messageId,
        direction: 'outgoing',
        from_number: account.phone_number,
        to_number: recipient,
        message_type: type,
        content: type === 'text' ? content.text : null,
        media_url: content.mediaUrl || null,
        caption: content.caption || null,
        status: result.status,
        provider_response: JSON.stringify(result)
      });

      logger.info(`Message sent: ${result.messageId}`);

      return {
        messageId: result.messageId,
        logId: messageLog.id,
        status: result.status,
        sentAt: messageLog.sent_at
      };
    } catch (error) {
      // Log failed message
      await MessageLog.create({
        workspace_id: workspaceId,
        account_id: accountId,
        direction: 'outgoing',
        from_number: account.phone_number,
        to_number: recipient,
        message_type: type,
        content: type === 'text' ? content.text : null,
        media_url: content.mediaUrl || null,
        status: 'failed',
        error_message: error.message
      });

      logger.error('Message send failed:', error);
      throw error;
    }
  }

  /**
   * Get message logs
   * Only returns messages sent/received through THIS service (WA-Gateway)
   * Messages are stored in database when sent via sendMessage() or received via webhooks
   * This does NOT fetch all message history from Baileys service
   */
  async getMessages(workspaceId, options = {}) {
    // Only return messages from database (messages sent/received through this service)
    return await MessageLog.findByWorkspace(workspaceId, options);
  }

  /**
   * Get message by ID
   */
  async getMessage(messageLogId, workspaceId) {
    const message = await MessageLog.findById(messageLogId);
    
    if (!message || message.workspace_id !== workspaceId) {
      throw new Error('Message not found');
    }

    return message;
  }

  /**
   * Log incoming message
   */
  async logIncomingMessage(normalizedMessage, accountId, workspaceId) {
    return await MessageLog.create({
      workspace_id: workspaceId,
      account_id: accountId,
      message_id: normalizedMessage.messageId,
      direction: 'incoming',
      from_number: normalizedMessage.from,
      to_number: normalizedMessage.to,
      message_type: normalizedMessage.type,
      content: normalizedMessage.content.text || null,
      media_url: normalizedMessage.content.mediaUrl || null,
      caption: normalizedMessage.content.caption || null,
      status: 'received'
    });
  }

  /**
   * Update message status
   */
  async updateMessageStatus(messageId, status) {
    const message = await MessageLog.findByMessageId(messageId);
    
    if (message) {
      await MessageLog.updateStatus(message.id, status, new Date());
    }
  }

  /**
   * Get message statistics
   */
  async getStats(workspaceId, accountId = null, days = 7) {
    return await MessageLog.getStats(workspaceId, accountId, days);
  }
}

module.exports = new MessageService();


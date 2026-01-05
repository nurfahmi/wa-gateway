const { EventTypes } = require('../providers/events');
const MessageLog = require('../models/MessageLog');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const Workspace = require('../models/Workspace');
const webhookService = require('./webhookService');
const autoReplyService = require('./autoReplyService');
const aiService = require('./aiService');
const contactService = require('./contactService');
const messageService = require('./messageService');
const logger = require('../utils/logger');

class EventHandlerService {
  /**
   * Handle incoming message event
   */
  async handleMessageReceived(event) {
    try {
      const { accountId, accountIdentifier } = event;

      // Get account details
      const account = await WhatsAppAccount.findById(accountId);
      if (!account) {
        logger.error(`Account not found for message event: ${accountId}`);
        return;
      }

      // Get workspace details
      const workspace = await Workspace.findById(account.workspace_id);
      if (!workspace) {
        logger.error(`Workspace not found for account: ${accountId}`);
        return;
      }

      // Log message to database
      const messageLog = await MessageLog.create({
        workspace_id: account.workspace_id,
        account_id: accountId,
        message_id: event.messageId,
        direction: event.direction,
        from_number: event.from,
        to_number: event.to,
        message_type: event.type,
        content: event.content.text || null,
        media_url: event.content.mediaUrl || null,
        caption: event.content.caption || null,
        status: event.status
      });

      logger.info(`Message received logged: ${messageLog.id}`, {
        accountId,
        from: event.from,
        type: event.type
      });

      // Update contact statistics
      await contactService.findOrCreateContact(
        workspace.id,
        event.from,
        { name: event.pushName || null }
      );
      await contactService.updateMessageStats(workspace.id, event.from);

      // Trigger webhook
      await webhookService.trigger(account.workspace_id, {
        event: EventTypes.MESSAGE_RECEIVED,
        accountId,
        message: {
          id: event.messageId,
          from: event.from,
          to: event.to,
          type: event.type,
          content: event.content,
          timestamp: event.timestamp,
          direction: event.direction
        }
      });

      // Process automation for incoming messages only (not from me)
      if (event.direction === 'incoming' && !event.fromMe) {
        await this.processAutomation(event, account, workspace);
      }
    } catch (error) {
      logger.error('Error handling message received event:', error);
    }
  }

  /**
   * Process automation (auto-reply and AI)
   */
  async processAutomation(message, account, workspace) {
    try {
      // Check for auto-reply rules first
      const autoReply = await autoReplyService.processMessage(message, account, workspace);
      
      if (autoReply) {
        logger.info(`Auto-reply triggered: ${autoReply.ruleName}`);
        
        // Apply delay if configured
        if (autoReply.delay > 0) {
          await this.delay(autoReply.delay * 1000);
        }

        // Send auto-reply
        await messageService.sendMessage(workspace.id, {
          accountId: account.id,
          recipient: message.from,
          type: 'text',
          content: { text: autoReply.message }
        });

        return; // Don't process AI if auto-reply was sent
      }

      // If no auto-reply, try AI response
      const aiResponse = await aiService.processMessage(message, account, workspace);
      
      if (aiResponse) {
        logger.info(`AI response triggered: ${aiResponse.model || 'ai'}`);
        
        // Apply delay if configured
        if (aiResponse.delay > 0) {
          await this.delay(aiResponse.delay * 1000);
        }

        // Send AI response
        await messageService.sendMessage(workspace.id, {
          accountId: account.id,
          recipient: message.from,
          type: 'text',
          content: { text: aiResponse.message }
        });
      }
    } catch (error) {
      logger.error('Error processing automation:', error);
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle connection update event
   */
  async handleConnectionUpdate(event) {
    try {
      const { accountId, status, phoneNumber } = event;

      // Update account status in database
      await WhatsAppAccount.updateStatus(accountId, status, phoneNumber);

      logger.info(`Connection status updated for account ${accountId}: ${status}`);

      // Get account to find workspace
      const account = await WhatsAppAccount.findById(accountId);
      if (account) {
        // Trigger webhook
        await webhookService.trigger(account.workspace_id, {
          event: EventTypes.CONNECTION_UPDATE,
          accountId,
          status,
          phoneNumber,
          timestamp: event.timestamp
        });
      }
    } catch (error) {
      logger.error('Error handling connection update event:', error);
    }
  }

  /**
   * Handle QR code event
   */
  async handleQRCode(event) {
    try {
      const { accountId, qrCode, expiresAt } = event;

      // Update QR code in database
      await WhatsAppAccount.updateQR(accountId, qrCode, expiresAt);

      logger.info(`QR code updated for account ${accountId}`);

      // Get account to find workspace
      const account = await WhatsAppAccount.findById(accountId);
      if (account) {
        // Trigger webhook (optional - for realtime QR updates)
        await webhookService.trigger(account.workspace_id, {
          event: EventTypes.QR_CODE,
          accountId,
          qrCode,
          expiresAt: expiresAt.toISOString()
        });
      }
    } catch (error) {
      logger.error('Error handling QR code event:', error);
    }
  }

  /**
   * Handle message status update event
   */
  async handleMessageStatus(event) {
    try {
      const { accountId, messageId, status } = event;

      // Update message status in database
      const message = await MessageLog.findByMessageId(messageId);
      if (message) {
        await MessageLog.updateStatus(message.id, status, new Date());

        logger.info(`Message status updated: ${messageId} -> ${status}`);

        // Trigger webhook
        await webhookService.trigger(message.workspace_id, {
          event: EventTypes.MESSAGE_STATUS,
          accountId,
          messageId,
          status,
          timestamp: event.timestamp
        });
      }
    } catch (error) {
      logger.error('Error handling message status event:', error);
    }
  }

  /**
   * Route event to appropriate handler
   */
  async handleEvent(event) {
    // Determine event type based on event structure
    if (event.messageId && event.content) {
      await this.handleMessageReceived(event);
    } else if (event.qrCode) {
      await this.handleQRCode(event);
    } else if (event.status && !event.messageId) {
      await this.handleConnectionUpdate(event);
    } else if (event.messageId && event.status) {
      await this.handleMessageStatus(event);
    } else {
      logger.warn('Unknown event type received:', event);
    }
  }
}

module.exports = new EventHandlerService();


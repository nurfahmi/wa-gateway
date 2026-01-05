const ScheduledMessage = require('../models/ScheduledMessage');
const BroadcastMessage = require('../models/BroadcastMessage');
const Contact = require('../models/Contact');
const messageService = require('./messageService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting message scheduler');

    // Run every minute
    this.interval = setInterval(() => {
      this.processPendingMessages();
      this.processPendingBroadcasts();
    }, 60000); // 60 seconds

    // Run immediately on start
    this.processPendingMessages();
    this.processPendingBroadcasts();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      logger.info('Message scheduler stopped');
    }
  }

  /**
   * Process pending scheduled messages
   */
  async processPendingMessages() {
    try {
      const messages = await ScheduledMessage.findPendingToSend(100);
      
      logger.info(`Processing ${messages.length} scheduled messages`);

      for (const msg of messages) {
        try {
          // Send message
          const result = await messageService.sendMessage(msg.workspace_id, {
            accountId: msg.account_id,
            recipient: msg.recipient,
            type: msg.media_url ? msg.media_type : 'text',
            content: msg.media_url ? {
              mediaUrl: msg.media_url,
              caption: msg.message
            } : {
              text: msg.message
            }
          });

          // Update status
          await ScheduledMessage.updateStatus(msg.id, 'sent', {
            message_id: result.messageId
          });

          logger.info(`Scheduled message ${msg.id} sent successfully`);
        } catch (error) {
          logger.error(`Error sending scheduled message ${msg.id}:`, error);
          
          await ScheduledMessage.updateStatus(msg.id, 'failed', {
            error_message: error.message
          });
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  }

  /**
   * Process pending broadcast messages
   */
  async processPendingBroadcasts() {
    try {
      const broadcasts = await BroadcastMessage.findReadyToSend(10);
      
      logger.info(`Processing ${broadcasts.length} broadcast campaigns`);

      for (const broadcast of broadcasts) {
        try {
          await this.processBroadcast(broadcast);
        } catch (error) {
          logger.error(`Error processing broadcast ${broadcast.id}:`, error);
          
          await BroadcastMessage.update(broadcast.id, {
            status: 'failed'
          });
        }
      }
    } catch (error) {
      logger.error('Error processing broadcasts:', error);
    }
  }

  /**
   * Process a single broadcast
   */
  async processBroadcast(broadcast) {
    // Mark as sending
    await BroadcastMessage.update(broadcast.id, {
      status: 'sending',
      started_at: new Date()
    });

    // Get recipients
    let recipients = [];
    
    if (broadcast.target_type === 'custom') {
      recipients = broadcast.target_phone_numbers || [];
    } else if (broadcast.target_type === 'all_contacts') {
      const contacts = await Contact.findByWorkspace(broadcast.workspace_id, {
        is_blocked: false,
        limit: 10000
      });
      recipients = contacts.map(c => c.phone_number);
    } else if (broadcast.target_type === 'group' && broadcast.target_group_id) {
      // TODO: Implement contact groups
      logger.warn('Contact groups not yet implemented');
    }

    logger.info(`Sending broadcast ${broadcast.id} to ${recipients.length} recipients`);

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        await messageService.sendMessage(broadcast.workspace_id, {
          accountId: broadcast.account_id,
          recipient: recipient,
          type: broadcast.media_url ? broadcast.media_type : 'text',
          content: broadcast.media_url ? {
            mediaUrl: broadcast.media_url,
            caption: broadcast.message
          } : {
            text: broadcast.message
          }
        });

        await BroadcastMessage.incrementSent(broadcast.id);

        // Add delay between messages to avoid spam detection
        await this.delay(2000); // 2 seconds
      } catch (error) {
        logger.error(`Error sending to ${recipient}:`, error);
        await BroadcastMessage.incrementFailed(broadcast.id);
      }
    }

    // Mark as completed
    await BroadcastMessage.markCompleted(broadcast.id);
    logger.info(`Broadcast ${broadcast.id} completed`);
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(workspaceId, data) {
    return await ScheduledMessage.create({
      workspace_id: workspaceId,
      ...data
    });
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(messageId) {
    return await ScheduledMessage.cancel(messageId);
  }

  /**
   * Get scheduled messages for workspace
   */
  async getScheduledMessages(workspaceId, options = {}) {
    return await ScheduledMessage.findByWorkspace(workspaceId, options);
  }

  /**
   * Create broadcast campaign
   */
  async createBroadcast(workspaceId, data) {
    const broadcast = await BroadcastMessage.create({
      workspace_id: workspaceId,
      ...data
    });

    // Calculate total recipients
    let totalRecipients = 0;
    
    if (data.target_type === 'custom') {
      totalRecipients = data.target_phone_numbers?.length || 0;
    } else if (data.target_type === 'all_contacts') {
      const stats = await Contact.getStats(workspaceId);
      totalRecipients = stats.total_contacts - stats.blocked_contacts;
    }

    await BroadcastMessage.update(broadcast.id, {
      total_recipients: totalRecipients
    });

    return BroadcastMessage.findById(broadcast.id);
  }

  /**
   * Get broadcasts for workspace
   */
  async getBroadcasts(workspaceId, options = {}) {
    return await BroadcastMessage.findByWorkspace(workspaceId, options);
  }

  /**
   * Get broadcast by ID
   */
  async getBroadcast(broadcastId) {
    return await BroadcastMessage.findById(broadcastId);
  }

  /**
   * Update broadcast
   */
  async updateBroadcast(broadcastId, data) {
    return await BroadcastMessage.update(broadcastId, data);
  }

  /**
   * Delete broadcast
   */
  async deleteBroadcast(broadcastId) {
    return await BroadcastMessage.delete(broadcastId);
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SchedulerService();


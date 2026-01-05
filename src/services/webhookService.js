const axios = require('axios');
const WebhookConfig = require('../models/WebhookConfig');
const crypto = require('../utils/crypto');
const logger = require('../utils/logger');

class WebhookService {
  /**
   * Configure webhook for workspace
   */
  async configureWebhook(workspaceId, data) {
    return await WebhookConfig.upsert(workspaceId, {
      url: data.url,
      secret: data.secret || crypto.generateRandomString(32),
      events: JSON.stringify(data.events),
      is_active: true
    });
  }

  /**
   * Get webhook configuration
   */
  async getWebhookConfig(workspaceId) {
    return await WebhookConfig.findByWorkspace(workspaceId);
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(workspaceId, data) {
    const config = await WebhookConfig.findByWorkspace(workspaceId);
    
    if (!config) {
      throw new Error('Webhook not configured');
    }

    const updateData = {};
    if (data.url) updateData.url = data.url;
    if (data.events) updateData.events = JSON.stringify(data.events);
    if (data.secret) updateData.secret = data.secret;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return await WebhookConfig.update(config.id, updateData);
  }

  /**
   * Delete webhook configuration
   */
  async deleteWebhook(workspaceId) {
    return await WebhookConfig.delete(workspaceId);
  }

  /**
   * Trigger webhook
   */
  async trigger(workspaceId, payload) {
    const config = await WebhookConfig.findActive(workspaceId);
    
    if (!config) {
      return; // No webhook configured
    }

    // Parse events
    const events = JSON.parse(config.events);
    
    // Check if this event type is enabled
    if (!events.includes(payload.event)) {
      return;
    }

    try {
      // Generate signature
      const signature = crypto.generateWebhookSignature(payload, config.secret);

      // Add metadata
      const webhookPayload = {
        ...payload,
        timestamp: Date.now(),
        workspaceId: workspaceId
      };

      // Send webhook
      const response = await axios.post(config.url, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'User-Agent': 'WhatsAppGateway-Webhook/1.0'
        },
        timeout: 10000 // 10 second timeout
      });

      // Update last triggered and reset failure count
      await WebhookConfig.resetFailureCount(config.id);

      logger.info(`Webhook delivered to workspace ${workspaceId}`, {
        event: payload.event,
        status: response.status
      });

      return {
        success: true,
        status: response.status
      };
    } catch (error) {
      logger.error(`Webhook delivery failed for workspace ${workspaceId}`, {
        event: payload.event,
        error: error.message
      });

      // Increment failure count
      await WebhookConfig.incrementFailureCount(config.id);

      // Check failure threshold
      const updatedConfig = await WebhookConfig.findById(config.id);
      if (updatedConfig.failure_count >= 10) {
        logger.warn(`Disabling webhook for workspace ${workspaceId} after 10 failures`);
        await WebhookConfig.disable(config.id);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test webhook
   */
  async testWebhook(workspaceId) {
    const testPayload = {
      event: 'webhook.test',
      message: 'This is a test webhook',
      timestamp: Date.now()
    };

    return await this.trigger(workspaceId, testPayload);
  }
}

module.exports = new WebhookService();


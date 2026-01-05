const webhookService = require('../services/webhookService');
const eventHandlerService = require('../services/eventHandlerService');
const response = require('../utils/response');
const logger = require('../utils/logger');

class WebhookController {
  /**
   * Configure webhook
   */
  async configure(req, res) {
    try {
      const { url, events, secret } = req.body;

      const config = await webhookService.configureWebhook(req.workspace.id, {
        url,
        events,
        secret
      });

      return response.success(res, config, 'Webhook configured successfully');
    } catch (error) {
      logger.error('Configure webhook error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Get webhook configuration
   */
  async get(req, res) {
    try {
      const config = await webhookService.getWebhookConfig(req.workspace.id);

      if (!config) {
        return response.notFound(res, 'Webhook configuration');
      }

      // Parse JSON fields
      config.events = JSON.parse(config.events);

      return response.success(res, config);
    } catch (error) {
      logger.error('Get webhook error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Update webhook configuration
   */
  async update(req, res) {
    try {
      const { url, events, secret, is_active } = req.body;

      const config = await webhookService.updateWebhook(req.workspace.id, {
        url,
        events,
        secret,
        is_active
      });

      // Parse JSON fields
      config.events = JSON.parse(config.events);

      return response.success(res, config, 'Webhook updated successfully');
    } catch (error) {
      logger.error('Update webhook error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Delete webhook configuration
   */
  async delete(req, res) {
    try {
      await webhookService.deleteWebhook(req.workspace.id);

      return response.success(res, null, 'Webhook deleted successfully');
    } catch (error) {
      logger.error('Delete webhook error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Test webhook
   */
  async test(req, res) {
    try {
      const result = await webhookService.testWebhook(req.workspace.id);

      if (result.success) {
        return response.success(res, result, 'Webhook test successful');
      } else {
        return response.error(res, 'Webhook test failed: ' + result.error, 400);
      }
    } catch (error) {
      logger.error('Test webhook error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Receive webhook from external Baileys service
   */
  async receiveBaileys(req, res) {
    try {
      const { event, sessionId, deviceId, message, status, phoneNumber, qr } = req.body;
      
      logger.info('Received Baileys webhook:', { event, sessionId, deviceId });
      
      // Process based on event type
      switch (event) {
        case 'message':
          if (message) {
            await eventHandlerService.handleEvent({
              type: 'message',
              accountIdentifier: sessionId,
              data: message
            });
          }
          break;
          
        case 'connection':
          await eventHandlerService.handleEvent({
            type: 'connection',
            accountIdentifier: sessionId,
            data: { status, phoneNumber }
          });
          break;
          
        case 'qr':
          if (qr) {
            // Update QR code in database
            const WhatsAppAccount = require('../models/WhatsAppAccount');
            const account = await WhatsAppAccount.findByIdentifier(sessionId);
            if (account) {
              await WhatsAppAccount.updateQR(
                account.id,
                qr,
                new Date(Date.now() + 60000)
              );
            }
          }
          break;
          
        default:
          logger.warn('Unknown Baileys webhook event:', event);
      }
      
      return response.success(res, null, 'Webhook received');
    } catch (error) {
      logger.error('Baileys webhook error:', error);
      // Return success anyway to prevent retries
      return response.success(res, null, 'Webhook processed');
    }
  }
}

module.exports = new WebhookController();


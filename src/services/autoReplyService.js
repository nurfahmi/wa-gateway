const AutoReplyRule = require('../models/AutoReplyRule');
const MessageTemplate = require('../models/MessageTemplate');
const Contact = require('../models/Contact');
const logger = require('../utils/logger');

class AutoReplyService {
  /**
   * Process incoming message and check for auto-reply rules
   */
  async processMessage(message, account, workspace) {
    try {
      // Get active rules for this workspace/account
      const rules = await AutoReplyRule.findActiveByWorkspace(
        workspace.id,
        account.id
      );

      if (rules.length === 0) {
        return null;
      }

      // Check if this is first message from contact (for welcome message)
      const contact = await Contact.findByPhone(workspace.id, message.from);
      const isFirstMessage = !contact || contact.message_count === 0;

      // Find matching rule
      for (const rule of rules) {
        // Check if it's a welcome rule and not first message
        if (rule.trigger_type === 'welcome' && !isFirstMessage) {
          continue;
        }

        // Check if rule matches
        if (AutoReplyRule.matchesRule(rule, message)) {
          // Check max triggers per contact
          if (rule.max_triggers_per_contact) {
            const triggerCount = await this.getContactTriggerCount(
              workspace.id,
              message.from,
              rule.id
            );
            
            if (triggerCount >= rule.max_triggers_per_contact) {
              logger.debug(`Max triggers reached for rule ${rule.id} and contact ${message.from}`);
              continue;
            }
          }

          // Get reply message
          let replyMessage = rule.reply_message;
          
          if (rule.reply_type === 'template' && rule.template_id) {
            const template = await MessageTemplate.findById(rule.template_id);
            if (template) {
              replyMessage = MessageTemplate.render(template, {
                name: contact?.name || 'there',
                phone: message.from
              });
            }
          }

          // Log trigger
          await this.logTrigger(workspace.id, message.from, rule.id);

          return {
            message: replyMessage,
            delay: rule.delay_seconds || 0,
            ruleId: rule.id,
            ruleName: rule.name
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error processing auto-reply:', error);
      return null;
    }
  }

  /**
   * Get trigger count for a contact and rule
   */
  async getContactTriggerCount(workspaceId, contactPhone, ruleId) {
    // This would ideally be tracked in a separate table
    // For now, we'll use message logs to estimate
    // TODO: Add auto_reply_triggers table for accurate tracking
    return 0;
  }

  /**
   * Log auto-reply trigger
   */
  async logTrigger(workspaceId, contactPhone, ruleId) {
    // TODO: Implement trigger logging in separate table
    logger.info(`Auto-reply triggered: workspace=${workspaceId}, contact=${contactPhone}, rule=${ruleId}`);
  }

  /**
   * Create auto-reply rule
   */
  async createRule(workspaceId, data) {
    return await AutoReplyRule.create({
      workspace_id: workspaceId,
      ...data
    });
  }

  /**
   * Update auto-reply rule
   */
  async updateRule(ruleId, data) {
    const rule = await AutoReplyRule.findById(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    await AutoReplyRule.update(ruleId, data);
    
    // Sync to Baileys service if account_id is set
    if (rule.account_id) {
      await this.syncRulesToBaileys(rule.account_id);
    }
    
    return await AutoReplyRule.findById(ruleId);
  }

  /**
   * Delete auto-reply rule
   */
  async deleteRule(ruleId) {
    const rule = await AutoReplyRule.findById(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    const accountId = rule.account_id;
    await AutoReplyRule.delete(ruleId);
    
    // Sync to Baileys service if account_id was set
    if (accountId) {
      await this.syncRulesToBaileys(accountId);
    }
    
    return true;
  }

  /**
   * Get all rules for workspace
   */
  async getRules(workspaceId, options = {}) {
    const { accountId, ...otherOptions } = options;
    
    if (accountId) {
      // Get rules for specific account (or workspace-wide rules where account_id is null)
      const allRules = await AutoReplyRule.findByWorkspace(workspaceId, otherOptions);
      return allRules.filter(rule => 
        rule.account_id === null || rule.account_id === accountId
      );
    }
    
    return await AutoReplyRule.findByWorkspace(workspaceId, otherOptions);
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId, isActive) {
    const rule = await AutoReplyRule.findById(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }
    
    await AutoReplyRule.update(ruleId, { is_active: isActive });
    
    // Sync to Baileys service if account_id is set
    if (rule.account_id) {
      await this.syncRulesToBaileys(rule.account_id);
    }
    
    return await AutoReplyRule.findById(ruleId);
  }

  /**
   * Sync auto-reply rules to Baileys service for a specific account
   */
  async syncRulesToBaileys(accountId) {
    try {
      const WhatsAppAccount = require('../models/WhatsAppAccount');
      const ProviderFactory = require('../providers/factory');
      
      const account = await WhatsAppAccount.findById(accountId);
      if (!account || account.status !== 'connected') {
        logger.warn(`Cannot sync rules: account ${accountId} not found or not connected`);
        return;
      }

      // Get all active rules for this account (including workspace-wide rules)
      // Baileys will execute all rules for this device
      const allRules = await AutoReplyRule.findActiveByWorkspace(
        account.workspace_id,
        accountId
      );

      if (allRules.length === 0) {
        logger.info(`No rules to sync for account ${accountId}`);
        // Still sync empty array to clear rules in Baileys
        const provider = ProviderFactory.create(account.provider);
        if (provider.syncAutoReplyRules) {
          await provider.syncAutoReplyRules(account.account_identifier, []);
        }
        return;
      }

      const provider = ProviderFactory.create(account.provider);
      if (provider.syncAutoReplyRules) {
        await provider.syncAutoReplyRules(account.account_identifier, allRules);
        logger.info(`Synced ${allRules.length} auto-reply rules to Baileys for account ${accountId} (including workspace-wide rules)`);
      } else {
        logger.warn(`Provider ${account.provider} does not support syncAutoReplyRules`);
      }
    } catch (error) {
      logger.error(`Error syncing rules to Baileys for account ${accountId}:`, error);
      throw error;
    }
  }
}

module.exports = new AutoReplyService();


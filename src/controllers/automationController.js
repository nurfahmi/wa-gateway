const autoReplyService = require('../services/autoReplyService');
const aiService = require('../services/aiService');
const templateService = require('../services/templateService');
const schedulerService = require('../services/schedulerService');
const contactService = require('../services/contactService');
const { successResponse, errorResponse } = require('../utils/response');

class AutomationController {
  // ==================== Auto-Reply Rules ====================
  
  /**
   * Get all auto-reply rules
   */
  async getRules(req, res) {
    const { workspaceId } = req;
    const rules = await autoReplyService.getRules(workspaceId);
    return successResponse(res, { rules });
  }

  /**
   * Create auto-reply rule
   */
  async createRule(req, res) {
    const { workspaceId } = req;
    const { account_id, ...ruleData } = req.body;
    
    // Validate account_id belongs to workspace if provided
    if (account_id) {
      const WhatsAppAccount = require('../models/WhatsAppAccount');
      const account = await WhatsAppAccount.findById(account_id);
      if (!account || account.workspace_id !== workspaceId) {
        return errorResponse(res, 'Invalid account_id', 400);
      }
    }
    
    const rule = await autoReplyService.createRule(workspaceId, {
      account_id: account_id || null,
      ...ruleData
    });
    return successResponse(res, { rule }, 201);
  }

  /**
   * Update auto-reply rule
   */
  async updateRule(req, res) {
    const { id } = req.params;
    await autoReplyService.updateRule(id, req.body);
    return successResponse(res, { message: 'Rule updated successfully' });
  }

  /**
   * Delete auto-reply rule
   */
  async deleteRule(req, res) {
    const { id } = req.params;
    await autoReplyService.deleteRule(id);
    return successResponse(res, { message: 'Rule deleted successfully' });
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(req, res) {
    const { id } = req.params;
    const { is_active } = req.body;
    await autoReplyService.toggleRule(id, is_active);
    return successResponse(res, { message: 'Rule status updated' });
  }

  // ==================== AI Configuration ====================

  /**
   * Get AI configuration
   */
  async getAIConfig(req, res) {
    const { workspaceId } = req;
    const { accountId } = req.query;
    const config = await aiService.getConfiguration(workspaceId, accountId);
    return successResponse(res, { config });
  }

  /**
   * Update AI configuration
   */
  async updateAIConfig(req, res) {
    const { workspaceId } = req;
    const { accountId } = req.query;
    const config = await aiService.configureAI(workspaceId, accountId, req.body);
    return successResponse(res, { config });
  }

  /**
   * Toggle AI auto-reply
   */
  async toggleAI(req, res) {
    const { workspaceId } = req;
    const { accountId, enabled } = req.body;
    await aiService.toggleAutoReply(workspaceId, accountId, enabled);
    return successResponse(res, { message: 'AI auto-reply updated' });
  }

  /**
   * Clear conversation history
   */
  async clearHistory(req, res) {
    const { workspaceId } = req;
    const { contactPhone } = req.params;
    await aiService.clearHistory(workspaceId, contactPhone);
    return successResponse(res, { message: 'Conversation history cleared' });
  }

  // ==================== Templates ====================

  /**
   * Get all templates
   */
  async getTemplates(req, res) {
    const { workspaceId } = req;
    const { category, favorite } = req.query;
    const templates = await templateService.getTemplates(workspaceId, {
      category,
      favorite: favorite === 'true'
    });
    return successResponse(res, { templates });
  }

  /**
   * Get single template
   */
  async getTemplate(req, res) {
    const { id } = req.params;
    const template = await templateService.getTemplate(id);
    
    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }
    
    return successResponse(res, { template });
  }

  /**
   * Create template
   */
  async createTemplate(req, res) {
    const { workspaceId } = req;
    const template = await templateService.createTemplate(workspaceId, req.body);
    return successResponse(res, { template }, 201);
  }

  /**
   * Update template
   */
  async updateTemplate(req, res) {
    const { id } = req.params;
    await templateService.updateTemplate(id, req.body);
    return successResponse(res, { message: 'Template updated successfully' });
  }

  /**
   * Delete template
   */
  async deleteTemplate(req, res) {
    const { id } = req.params;
    await templateService.deleteTemplate(id);
    return successResponse(res, { message: 'Template deleted successfully' });
  }

  /**
   * Toggle template favorite
   */
  async toggleFavorite(req, res) {
    const { id } = req.params;
    const { is_favorite } = req.body;
    await templateService.toggleFavorite(id, is_favorite);
    return successResponse(res, { message: 'Template favorite status updated' });
  }

  // ==================== Scheduled Messages ====================

  /**
   * Get scheduled messages
   */
  async getScheduledMessages(req, res) {
    const { workspaceId } = req;
    const { status } = req.query;
    const messages = await schedulerService.getScheduledMessages(workspaceId, { status });
    return successResponse(res, { messages });
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(req, res) {
    const { workspaceId } = req;
    const message = await schedulerService.scheduleMessage(workspaceId, req.body);
    return successResponse(res, { message }, 201);
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(req, res) {
    const { id } = req.params;
    await schedulerService.cancelScheduledMessage(id);
    return successResponse(res, { message: 'Scheduled message cancelled' });
  }

  // ==================== Broadcast Messages ====================

  /**
   * Get broadcasts
   */
  async getBroadcasts(req, res) {
    const { workspaceId } = req;
    const { status } = req.query;
    const broadcasts = await schedulerService.getBroadcasts(workspaceId, { status });
    return successResponse(res, { broadcasts });
  }

  /**
   * Get single broadcast
   */
  async getBroadcast(req, res) {
    const { id } = req.params;
    const broadcast = await schedulerService.getBroadcast(id);
    
    if (!broadcast) {
      return errorResponse(res, 'Broadcast not found', 404);
    }
    
    return successResponse(res, { broadcast });
  }

  /**
   * Create broadcast
   */
  async createBroadcast(req, res) {
    const { workspaceId } = req;
    const broadcast = await schedulerService.createBroadcast(workspaceId, req.body);
    return successResponse(res, { broadcast }, 201);
  }

  /**
   * Update broadcast
   */
  async updateBroadcast(req, res) {
    const { id } = req.params;
    await schedulerService.updateBroadcast(id, req.body);
    return successResponse(res, { message: 'Broadcast updated successfully' });
  }

  /**
   * Delete broadcast
   */
  async deleteBroadcast(req, res) {
    const { id } = req.params;
    await schedulerService.deleteBroadcast(id);
    return successResponse(res, { message: 'Broadcast deleted successfully' });
  }

  // ==================== Contacts ====================

  /**
   * Get all contacts
   */
  async getContacts(req, res) {
    const { workspaceId } = req;
    const { search, tags, is_blocked, limit, offset } = req.query;
    
    const contacts = await contactService.getContacts(workspaceId, {
      search,
      tags: tags ? tags.split(',') : undefined,
      is_blocked: is_blocked === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });
    
    return successResponse(res, { contacts });
  }

  /**
   * Get contact by ID
   */
  async getContact(req, res) {
    const { id } = req.params;
    const contact = await contactService.getContact(id);
    
    if (!contact) {
      return errorResponse(res, 'Contact not found', 404);
    }
    
    return successResponse(res, { contact });
  }

  /**
   * Create contact
   */
  async createContact(req, res) {
    const { workspaceId } = req;
    const contact = await contactService.createContact(workspaceId, req.body);
    return successResponse(res, { contact }, 201);
  }

  /**
   * Update contact
   */
  async updateContact(req, res) {
    const { id } = req.params;
    await contactService.updateContact(id, req.body);
    return successResponse(res, { message: 'Contact updated successfully' });
  }

  /**
   * Delete contact
   */
  async deleteContact(req, res) {
    const { id } = req.params;
    await contactService.deleteContact(id);
    return successResponse(res, { message: 'Contact deleted successfully' });
  }

  /**
   * Block contact
   */
  async blockContact(req, res) {
    const { id } = req.params;
    await contactService.blockContact(id);
    return successResponse(res, { message: 'Contact blocked successfully' });
  }

  /**
   * Unblock contact
   */
  async unblockContact(req, res) {
    const { id } = req.params;
    await contactService.unblockContact(id);
    return successResponse(res, { message: 'Contact unblocked successfully' });
  }

  /**
   * Get contact statistics
   */
  async getContactStats(req, res) {
    const { workspaceId } = req;
    const stats = await contactService.getStats(workspaceId);
    return successResponse(res, { stats });
  }

  /**
   * Import contacts
   */
  async importContacts(req, res) {
    const { workspaceId } = req;
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return errorResponse(res, 'Invalid contacts array', 400);
    }
    
    const results = await contactService.importContacts(workspaceId, contacts);
    return successResponse(res, { results });
  }

  /**
   * Export contacts
   */
  async exportContacts(req, res) {
    const { workspaceId } = req;
    const contacts = await contactService.exportContacts(workspaceId);
    return successResponse(res, { contacts });
  }
}

module.exports = new AutomationController();


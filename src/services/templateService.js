const MessageTemplate = require('../models/MessageTemplate');
const logger = require('../utils/logger');

class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(workspaceId, data) {
    // Extract variables from content
    const variables = MessageTemplate.extractVariables(data.content);
    
    return await MessageTemplate.create({
      workspace_id: workspaceId,
      variables,
      ...data
    });
  }

  /**
   * Get all templates for workspace
   */
  async getTemplates(workspaceId, options = {}) {
    return await MessageTemplate.findByWorkspace(workspaceId, options);
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId) {
    return await MessageTemplate.findById(templateId);
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, data) {
    // Extract variables if content is being updated
    if (data.content) {
      data.variables = MessageTemplate.extractVariables(data.content);
    }
    
    return await MessageTemplate.update(templateId, data);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    return await MessageTemplate.delete(templateId);
  }

  /**
   * Render template with variables
   */
  renderTemplate(template, variables = {}) {
    return MessageTemplate.render(template, variables);
  }

  /**
   * Use template (increment usage count)
   */
  async useTemplate(templateId, variables = {}) {
    const template = await MessageTemplate.findById(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    // Increment usage
    await MessageTemplate.incrementUsage(templateId);

    // Render and return
    return this.renderTemplate(template, variables);
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(templateId, isFavorite) {
    return await MessageTemplate.update(templateId, { is_favorite: isFavorite });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(workspaceId, category) {
    return await MessageTemplate.findByWorkspace(workspaceId, { category });
  }

  /**
   * Get favorite templates
   */
  async getFavoriteTemplates(workspaceId) {
    return await MessageTemplate.findByWorkspace(workspaceId, { favorite: true });
  }
}

module.exports = new TemplateService();


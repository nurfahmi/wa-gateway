const AIConfiguration = require('../models/AIConfiguration');
const ConversationLog = require('../models/ConversationLog');
const Contact = require('../models/Contact');
const logger = require('../utils/logger');
const config = require('../config');

class AIService {
  /**
   * Process message with AI
   */
  async processMessage(message, account, workspace) {
    try {
      // Get AI configuration
      const aiConfig = await AIConfiguration.findByWorkspaceAndAccount(
        workspace.id,
        account.id
      );

      if (!aiConfig || !aiConfig.is_enabled || !aiConfig.auto_reply_enabled) {
        return null;
      }

      // Check business hours if required
      if (!AIConfiguration.shouldRespondNow(aiConfig)) {
        logger.debug('AI not responding: outside business hours');
        return null;
      }

      // Get conversation history if enabled
      let conversationHistory = [];
      if (aiConfig.conversation_memory_enabled) {
        conversationHistory = await ConversationLog.getHistoryForAI(
          workspace.id,
          account.id,
          message.from,
          aiConfig.conversation_memory_messages
        );
      }

      // Log user message
      await ConversationLog.create({
        workspace_id: workspace.id,
        account_id: account.id,
        contact_phone: message.from,
        role: 'user',
        content: message.content.text || '[media]'
      });

      // Generate AI response
      const aiResponse = await this.generateResponse(
        aiConfig,
        message.content.text,
        conversationHistory
      );

      if (!aiResponse) {
        return null;
      }

      // Log assistant message
      await ConversationLog.create({
        workspace_id: workspace.id,
        account_id: account.id,
        contact_phone: message.from,
        role: 'assistant',
        content: aiResponse
      });

      return {
        message: aiResponse,
        delay: aiConfig.auto_reply_delay_seconds || 2,
        source: 'ai',
        model: aiConfig.model
      };
    } catch (error) {
      logger.error('Error processing AI message:', error);
      
      // Return fallback message if configured
      const aiConfig = await AIConfiguration.findByWorkspaceAndAccount(
        workspace.id,
        account.id
      );
      
      if (aiConfig?.fallback_message) {
        return {
          message: aiConfig.fallback_message,
          delay: 1,
          source: 'fallback'
        };
      }

      return null;
    }
  }

  /**
   * Generate AI response using OpenAI
   */
  async generateResponse(aiConfig, userMessage, conversationHistory = []) {
    try {
      const openaiApiKey = config.openai.apiKey;
      
      if (!openaiApiKey) {
        logger.warn('OpenAI API key not configured');
        return null;
      }

      // Build messages array for OpenAI
      const messages = [];

      // Add system prompt
      if (aiConfig.system_prompt) {
        messages.push({
          role: 'system',
          content: aiConfig.system_prompt
        });
      }

      // Add conversation history
      messages.push(...conversationHistory);

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model || 'gpt-4',
          messages: messages,
          temperature: aiConfig.temperature || 0.7,
          max_tokens: aiConfig.max_tokens || 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error('OpenAI API error:', error);
        return null;
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      return aiResponse;
    } catch (error) {
      logger.error('Error generating AI response:', error);
      return null;
    }
  }

  /**
   * Create or update AI configuration
   */
  async configureAI(workspaceId, accountId, data) {
    const existing = await AIConfiguration.findByWorkspaceAndAccount(
      workspaceId,
      accountId
    );

    if (existing) {
      await AIConfiguration.update(existing.id, data);
      return await AIConfiguration.findById(existing.id);
    } else {
      return await AIConfiguration.create({
        workspace_id: workspaceId,
        account_id: accountId,
        ...data
      });
    }
  }

  /**
   * Get AI configuration
   */
  async getConfiguration(workspaceId, accountId = null) {
    return await AIConfiguration.findByWorkspaceAndAccount(workspaceId, accountId);
  }

  /**
   * Toggle AI auto-reply
   */
  async toggleAutoReply(workspaceId, accountId, enabled) {
    const config = await AIConfiguration.findByWorkspaceAndAccount(
      workspaceId,
      accountId
    );

    if (config) {
      await AIConfiguration.update(config.id, {
        auto_reply_enabled: enabled
      });
    }
  }

  /**
   * Clear conversation history for a contact
   */
  async clearHistory(workspaceId, contactPhone) {
    await ConversationLog.deleteForContact(workspaceId, contactPhone);
  }
}

module.exports = new AIService();


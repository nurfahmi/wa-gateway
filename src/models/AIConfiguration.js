const db = require('../config/database');

class AIConfiguration {
  /**
   * Create AI configuration
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO ai_configurations 
       (workspace_id, account_id, is_enabled, provider, model, system_prompt, bot_name,
        temperature, max_tokens, auto_reply_enabled, auto_reply_delay_seconds, language,
        fallback_message, conversation_memory_enabled, conversation_memory_messages,
        rate_limit_per_hour, business_hours_only, business_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.account_id || null,
        data.is_enabled || false,
        data.provider || 'openai',
        data.model || 'gpt-4',
        data.system_prompt || null,
        data.bot_name || 'Assistant',
        data.temperature || 0.7,
        data.max_tokens || 500,
        data.auto_reply_enabled || false,
        data.auto_reply_delay_seconds || 2,
        data.language || 'en',
        data.fallback_message || null,
        data.conversation_memory_enabled !== false,
        data.conversation_memory_messages || 10,
        data.rate_limit_per_hour || 100,
        data.business_hours_only || false,
        data.business_hours ? JSON.stringify(data.business_hours) : null
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM ai_configurations WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].business_hours) {
      rows[0].business_hours = JSON.parse(rows[0].business_hours);
    }
    return rows[0];
  }

  /**
   * Find by workspace and account
   */
  static async findByWorkspaceAndAccount(workspaceId, accountId = null) {
    const [rows] = await db.execute(
      `SELECT * FROM ai_configurations 
       WHERE workspace_id = ? AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))
       LIMIT 1`,
      [workspaceId, accountId, accountId]
    );
    if (rows[0] && rows[0].business_hours) {
      rows[0].business_hours = JSON.parse(rows[0].business_hours);
    }
    return rows[0];
  }

  /**
   * Update configuration
   */
  static async update(id, data) {
    const updates = [];
    const values = [];

    const fields = [
      'is_enabled', 'provider', 'model', 'system_prompt', 'bot_name',
      'temperature', 'max_tokens', 'auto_reply_enabled', 'auto_reply_delay_seconds',
      'language', 'fallback_message', 'conversation_memory_enabled',
      'conversation_memory_messages', 'rate_limit_per_hour', 'business_hours_only',
      'require_trigger', 'trigger_word', 'ai_rule'
    ];

    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.business_hours !== undefined) {
      updates.push('business_hours = ?');
      values.push(JSON.stringify(data.business_hours));
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.execute(
      `UPDATE ai_configurations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete configuration
   */
  static async delete(id) {
    await db.execute('DELETE FROM ai_configurations WHERE id = ?', [id]);
  }

  /**
   * Check if AI should respond based on business hours
   */
  static shouldRespondNow(config, currentTime = new Date()) {
    if (!config.business_hours_only) return true;
    if (!config.business_hours) return true;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[currentTime.getDay()];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const dayHours = config.business_hours[currentDay];
    if (!dayHours || dayHours.length === 0) return false;

    for (const range of dayHours) {
      const [start, end] = range.split('-');
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
        return true;
      }
    }

    return false;
  }
}

module.exports = AIConfiguration;


const db = require('../config/database');

class AutoReplyRule {
  /**
   * Create a new auto-reply rule
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO auto_reply_rules 
       (workspace_id, account_id, name, trigger_type, trigger_value, reply_message, 
        reply_type, template_id, is_active, priority, delay_seconds, max_triggers_per_contact, conditions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.account_id || null,
        data.name,
        data.trigger_type,
        data.trigger_value || null,
        data.reply_message,
        data.reply_type || 'text',
        data.template_id || null,
        data.is_active !== undefined ? data.is_active : true,
        data.priority || 0,
        data.delay_seconds || 0,
        data.max_triggers_per_contact || null,
        data.conditions ? JSON.stringify(data.conditions) : null
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find rule by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM auto_reply_rules WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].conditions) {
      rows[0].conditions = JSON.parse(rows[0].conditions);
    }
    return rows[0];
  }

  /**
   * Find all active rules for a workspace
   */
  static async findActiveByWorkspace(workspaceId, accountId = null) {
    let query = `
      SELECT * FROM auto_reply_rules 
      WHERE workspace_id = ? AND is_active = TRUE 
      AND (account_id IS NULL OR account_id = ?)
      ORDER BY priority DESC, created_at ASC
    `;
    const [rows] = await db.execute(query, [workspaceId, accountId]);
    return rows.map(row => {
      if (row.conditions) {
        row.conditions = JSON.parse(row.conditions);
      }
      return row;
    });
  }

  /**
   * Find all rules for a workspace
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const [rows] = await db.execute(
      `SELECT * FROM auto_reply_rules 
       WHERE workspace_id = ? 
       ORDER BY priority DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [workspaceId, limit, offset]
    );
    
    return rows.map(row => {
      if (row.conditions) {
        row.conditions = JSON.parse(row.conditions);
      }
      return row;
    });
  }

  /**
   * Update rule
   */
  static async update(id, data) {
    const updates = [];
    const values = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.trigger_type !== undefined) {
      updates.push('trigger_type = ?');
      values.push(data.trigger_type);
    }
    if (data.trigger_value !== undefined) {
      updates.push('trigger_value = ?');
      values.push(data.trigger_value);
    }
    if (data.reply_message !== undefined) {
      updates.push('reply_message = ?');
      values.push(data.reply_message);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.conditions !== undefined) {
      updates.push('conditions = ?');
      values.push(JSON.stringify(data.conditions));
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.execute(
      `UPDATE auto_reply_rules SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete rule
   */
  static async delete(id) {
    await db.execute('DELETE FROM auto_reply_rules WHERE id = ?', [id]);
  }

  /**
   * Check if message matches rule
   */
  static matchesRule(rule, message, currentTime = new Date()) {
    const messageText = (message.content?.text || '').toLowerCase();

    switch (rule.trigger_type) {
      case 'keyword':
      case 'contains':
        if (!rule.trigger_value) return false;
        const keywords = rule.trigger_value.toLowerCase().split(',').map(k => k.trim());
        return keywords.some(keyword => messageText.includes(keyword));

      case 'exact_match':
        return messageText === rule.trigger_value.toLowerCase();

      case 'regex':
        try {
          const regex = new RegExp(rule.trigger_value, 'i');
          return regex.test(messageText);
        } catch (e) {
          return false;
        }

      case 'welcome':
        // Welcome message for first-time contacts
        return true; // Should be checked elsewhere if this is first message

      case 'business_hours':
        return this.checkBusinessHours(rule.conditions, currentTime);

      case 'fallback':
        // Fallback rule when no other rule matches
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if current time is within/outside business hours
   */
  static checkBusinessHours(conditions, currentTime) {
    if (!conditions || !conditions.business_hours) return false;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[currentTime.getDay()];
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const dayHours = conditions.business_hours[currentDay];
    if (!dayHours || dayHours.length === 0) {
      return conditions.outside_hours === true;
    }

    for (const range of dayHours) {
      const [start, end] = range.split('-');
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
        return conditions.outside_hours !== true;
      }
    }

    return conditions.outside_hours === true;
  }
}

module.exports = AutoReplyRule;


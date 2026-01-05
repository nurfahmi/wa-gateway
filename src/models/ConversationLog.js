const db = require('../config/database');

class ConversationLog {
  /**
   * Create a new conversation log entry
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO conversation_logs 
       (workspace_id, account_id, contact_phone, role, content, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.account_id,
        data.contact_phone,
        data.role, // 'user', 'assistant', 'system'
        data.content,
        data.timestamp || new Date()
      ]
    );
    return result.insertId;
  }

  /**
   * Get conversation history for a contact
   */
  static async getHistory(workspaceId, accountId, contactPhone, limit = 10) {
    const [rows] = await db.execute(
      `SELECT * FROM conversation_logs 
       WHERE workspace_id = ? AND account_id = ? AND contact_phone = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [workspaceId, accountId, contactPhone, limit]
    );
    return rows.reverse(); // Return in chronological order
  }

  /**
   * Get recent conversations as OpenAI format
   */
  static async getHistoryForAI(workspaceId, accountId, contactPhone, limit = 10) {
    const history = await this.getHistory(workspaceId, accountId, contactPhone, limit);
    
    return history.map(log => ({
      role: log.role,
      content: log.content
    }));
  }

  /**
   * Delete old conversation logs
   */
  static async deleteOlderThan(days = 30) {
    await db.execute(
      `DELETE FROM conversation_logs 
       WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
  }

  /**
   * Delete all logs for a contact
   */
  static async deleteForContact(workspaceId, contactPhone) {
    await db.execute(
      'DELETE FROM conversation_logs WHERE workspace_id = ? AND contact_phone = ?',
      [workspaceId, contactPhone]
    );
  }
}

module.exports = ConversationLog;


const db = require('../config/database');

class ScheduledMessage {
  /**
   * Create a new scheduled message
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO scheduled_messages 
       (workspace_id, account_id, recipient, message, media_url, media_type, scheduled_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.account_id,
        data.recipient,
        data.message,
        data.media_url || null,
        data.media_type || null,
        data.scheduled_at,
        data.status || 'pending'
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM scheduled_messages WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /**
   * Find pending messages to send
   */
  static async findPendingToSend(limit = 100) {
    const [rows] = await db.execute(
      `SELECT sm.*, wa.account_identifier, wa.provider 
       FROM scheduled_messages sm
       JOIN whatsapp_accounts wa ON sm.account_id = wa.id
       WHERE sm.status = 'pending' 
       AND sm.scheduled_at <= NOW()
       AND wa.status = 'connected'
       ORDER BY sm.scheduled_at ASC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  /**
   * Find by workspace
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const { status, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM scheduled_messages WHERE workspace_id = ?';
    const params = [workspaceId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY scheduled_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * Update status
   */
  static async updateStatus(id, status, data = {}) {
    const updates = ['status = ?'];
    const values = [status];

    if (status === 'sent') {
      updates.push('sent_at = CURRENT_TIMESTAMP');
      if (data.message_id) {
        updates.push('message_id = ?');
        values.push(data.message_id);
      }
    }

    if (status === 'failed' && data.error_message) {
      updates.push('error_message = ?');
      values.push(data.error_message);
    }

    values.push(id);
    await db.execute(
      `UPDATE scheduled_messages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Cancel scheduled message
   */
  static async cancel(id) {
    await db.execute(
      'UPDATE scheduled_messages SET status = ? WHERE id = ? AND status = ?',
      ['cancelled', id, 'pending']
    );
  }

  /**
   * Delete old completed/failed messages
   */
  static async deleteOlderThan(days = 30) {
    await db.execute(
      `DELETE FROM scheduled_messages 
       WHERE status IN ('sent', 'failed', 'cancelled') 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
  }
}

module.exports = ScheduledMessage;


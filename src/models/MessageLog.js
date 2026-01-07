const db = require('../config/database');

class MessageLog {
  /**
   * Create message log
   */
  static async create(data) {
    const [result] = await db.query(
      'INSERT INTO message_logs SET ?',
      [data]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM message_logs WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find by message ID
   */
  static async findByMessageId(messageId) {
    const [rows] = await db.query(
      'SELECT * FROM message_logs WHERE message_id = ?',
      [messageId]
    );
    return rows[0] || null;
  }

  /**
   * Find by workspace with pagination
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let query = 'SELECT * FROM message_logs WHERE workspace_id = ?';
    const params = [workspaceId];

    // Filters
    if (options.accountId) {
      query += ' AND account_id = ?';
      params.push(options.accountId);
    }

    if (options.direction) {
      query += ' AND direction = ?';
      params.push(options.direction);
    }

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }

    if (options.fromNumber) {
      query += ' AND from_number = ?';
      params.push(options.fromNumber);
    }

    if (options.toNumber) {
      query += ' AND to_number = ?';
      params.push(options.toNumber);
    }

    if (options.startDate) {
      query += ' AND sent_at >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      query += ' AND sent_at <= ?';
      params.push(options.endDate);
    }

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated results - use interpolated LIMIT/OFFSET for compatibility
    const safeLimit = parseInt(limit, 10) || 50;
    const safeOffset = parseInt(offset, 10) || 0;
    query += ` ORDER BY sent_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await db.query(query, params);

    return {
      messages: rows,
      total,
      limit,
      offset
    };
  }

  /**
   * Update message status
   */
  static async updateStatus(id, status, timestamp = null) {
    const data = { status };
    
    if (status === 'delivered' && timestamp) {
      data.delivered_at = timestamp;
    } else if (status === 'read' && timestamp) {
      data.read_at = timestamp;
    }

    await db.query(
      'UPDATE message_logs SET ? WHERE id = ?',
      [data, id]
    );
    return this.findById(id);
  }

  /**
   * Update by message ID
   */
  static async updateByMessageId(messageId, data) {
    await db.query(
      'UPDATE message_logs SET ? WHERE message_id = ?',
      [data, messageId]
    );
    return this.findByMessageId(messageId);
  }

  /**
   * Delete old messages (for retention policy)
   */
  static async deleteOlderThan(workspaceId, date) {
    const [result] = await db.query(
      'DELETE FROM message_logs WHERE workspace_id = ? AND sent_at < ?',
      [workspaceId, date]
    );
    return result.affectedRows;
  }

  /**
   * Get message statistics
   */
  static async getStats(workspaceId, accountId = null, days = 7) {
    const params = [workspaceId];
    let accountFilter = '';

    if (accountId) {
      accountFilter = ' AND account_id = ?';
      params.push(accountId);
    }

    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as sent_messages,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as received_messages,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_messages,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_messages
       FROM message_logs 
       WHERE workspace_id = ? ${accountFilter}
       AND sent_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [...params, days]
    );

    return stats[0];
  }
}

module.exports = MessageLog;


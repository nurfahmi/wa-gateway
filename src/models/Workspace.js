const db = require('../config/database');

class Workspace {
  /**
   * Find workspace by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM workspaces WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create new workspace
   */
  static async create(data) {
    const [result] = await db.query(
      'INSERT INTO workspaces SET ?',
      [data]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update workspace
   */
  static async update(id, data) {
    await db.query(
      'UPDATE workspaces SET ? WHERE id = ?',
      [data, id]
    );
    return this.findById(id);
  }

  /**
   * Update subscription tier and limits
   */
  static async updateSubscription(id, tier, limits) {
    await db.query(
      `UPDATE workspaces 
       SET subscription_tier = ?, 
           device_limit = ?, 
           rate_limit_per_minute = ?
       WHERE id = ?`,
      [tier, limits.deviceLimit, limits.rateLimitPerMinute, id]
    );
    return this.findById(id);
  }

  /**
   * Find all workspaces
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM workspaces WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    if (filters.subscription_tier) {
      query += ' AND subscription_tier = ?';
      params.push(filters.subscription_tier);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Delete workspace
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM workspaces WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get workspace statistics
   */
  static async getStats(workspaceId) {
    const [stats] = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM whatsapp_accounts WHERE workspace_id = ? AND status = 'connected') as connected_accounts,
        (SELECT COUNT(*) FROM whatsapp_accounts WHERE workspace_id = ?) as total_accounts,
        (SELECT COUNT(*) FROM message_logs WHERE workspace_id = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as messages_24h,
        (SELECT COUNT(*) FROM message_logs WHERE workspace_id = ?) as total_messages`,
      [workspaceId, workspaceId, workspaceId, workspaceId]
    );
    return stats[0];
  }
}

module.exports = Workspace;


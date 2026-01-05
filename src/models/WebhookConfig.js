const db = require('../config/database');

class WebhookConfig {
  /**
   * Find by workspace
   */
  static async findByWorkspace(workspaceId) {
    const [rows] = await db.query(
      'SELECT * FROM webhook_configs WHERE workspace_id = ?',
      [workspaceId]
    );
    return rows[0] || null;
  }

  /**
   * Find active webhook by workspace
   */
  static async findActive(workspaceId) {
    const [rows] = await db.query(
      'SELECT * FROM webhook_configs WHERE workspace_id = ? AND is_active = TRUE',
      [workspaceId]
    );
    return rows[0] || null;
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM webhook_configs WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create or update webhook config
   */
  static async upsert(workspaceId, data) {
    // Check if config exists
    const existing = await this.findByWorkspace(workspaceId);

    if (existing) {
      return this.update(existing.id, data);
    }

    const [result] = await db.query(
      'INSERT INTO webhook_configs SET ?',
      [{ workspace_id: workspaceId, ...data }]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update webhook config
   */
  static async update(id, data) {
    await db.query(
      'UPDATE webhook_configs SET ? WHERE id = ?',
      [data, id]
    );
    return this.findById(id);
  }

  /**
   * Delete webhook config
   */
  static async delete(workspaceId) {
    const [result] = await db.query(
      'DELETE FROM webhook_configs WHERE workspace_id = ?',
      [workspaceId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Increment failure count
   */
  static async incrementFailureCount(id) {
    await db.query(
      'UPDATE webhook_configs SET failure_count = failure_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Reset failure count
   */
  static async resetFailureCount(id) {
    await db.query(
      'UPDATE webhook_configs SET failure_count = 0, last_triggered_at = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * Disable webhook
   */
  static async disable(id) {
    await db.query(
      'UPDATE webhook_configs SET is_active = FALSE WHERE id = ?',
      [id]
    );
  }

  /**
   * Enable webhook
   */
  static async enable(id) {
    await db.query(
      'UPDATE webhook_configs SET is_active = TRUE, failure_count = 0 WHERE id = ?',
      [id]
    );
  }
}

module.exports = WebhookConfig;


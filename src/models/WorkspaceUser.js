const db = require('../config/database');

class WorkspaceUser {
  /**
   * Find by OAuth user ID
   */
  static async findByOAuthId(oauthUserId) {
    const [rows] = await db.query(
      'SELECT * FROM workspace_users WHERE oauth_user_id = ?',
      [oauthUserId]
    );
    return rows[0] || null;
  }

  /**
   * Find by workspace ID
   */
  static async findByWorkspace(workspaceId) {
    const [rows] = await db.query(
      'SELECT * FROM workspace_users WHERE workspace_id = ?',
      [workspaceId]
    );
    return rows;
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM workspace_users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create workspace user
   */
  static async create(data) {
    const [result] = await db.query(
      'INSERT INTO workspace_users SET ?',
      [data]
    );
    return this.findById(result.insertId);
  }

  /**
   * Update workspace user
   */
  static async update(id, data) {
    await db.query(
      'UPDATE workspace_users SET ? WHERE id = ?',
      [data, id]
    );
    return this.findById(id);
  }

  /**
   * Delete workspace user
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM workspace_users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Check if user has access to workspace
   */
  static async hasAccess(oauthUserId, workspaceId) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM workspace_users WHERE oauth_user_id = ? AND workspace_id = ?',
      [oauthUserId, workspaceId]
    );
    return rows[0].count > 0;
  }

  /**
   * Find all workspace users
   */
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM workspace_users ORDER BY created_at DESC');
    return rows;
  }
}

module.exports = WorkspaceUser;


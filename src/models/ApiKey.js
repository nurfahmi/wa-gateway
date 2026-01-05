const db = require('../config/database');
const crypto = require('../utils/crypto');

class ApiKey {
  /**
   * Find by hash
   */
  static async findByHash(keyHash) {
    const [rows] = await db.query(
      'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = TRUE',
      [keyHash]
    );
    return rows[0] || null;
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM api_keys WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Find by workspace
   */
  static async findByWorkspace(workspaceId) {
    const [rows] = await db.query(
      'SELECT id, workspace_id, key_prefix, name, last_used_at, expires_at, is_active, created_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC',
      [workspaceId]
    );
    return rows;
  }

  /**
   * Create API key
   */
  static async create(workspaceId, name = null) {
    const apiKey = crypto.generateApiKey('gw_live');
    const keyHash = crypto.hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12);

    const [result] = await db.query(
      'INSERT INTO api_keys (workspace_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?)',
      [workspaceId, keyHash, keyPrefix, name]
    );

    return {
      id: result.insertId,
      apiKey: apiKey, // Return plain key only once
      prefix: keyPrefix
    };
  }

  /**
   * Update last used timestamp
   */
  static async updateLastUsed(id) {
    await db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * Revoke API key
   */
  static async revoke(id) {
    const [result] = await db.query(
      'UPDATE api_keys SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete API key
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM api_keys WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Find workspace by API key hash
   */
  static async findWorkspaceByKey(keyHash) {
    const [rows] = await db.query(
      `SELECT w.* FROM workspaces w
       JOIN api_keys ak ON w.id = ak.workspace_id
       WHERE ak.key_hash = ? AND ak.is_active = TRUE AND w.is_active = TRUE`,
      [keyHash]
    );
    return rows[0] || null;
  }
}

module.exports = ApiKey;


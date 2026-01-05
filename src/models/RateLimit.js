const db = require('../config/database');

class RateLimit {
  /**
   * Find or create rate limit record
   */
  static async findOrCreate(workspaceId, windowStart) {
    const [rows] = await db.query(
      'SELECT * FROM rate_limits WHERE workspace_id = ? AND window_start = ?',
      [workspaceId, windowStart]
    );

    if (rows[0]) {
      return rows[0];
    }

    // Create new record
    const [result] = await db.query(
      'INSERT INTO rate_limits (workspace_id, window_start, request_count) VALUES (?, ?, 0)',
      [workspaceId, windowStart]
    );

    return {
      id: result.insertId,
      workspace_id: workspaceId,
      window_start: windowStart,
      request_count: 0
    };
  }

  /**
   * Increment request count
   */
  static async increment(workspaceId, windowStart) {
    await db.query(
      `INSERT INTO rate_limits (workspace_id, window_start, request_count) 
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
      [workspaceId, windowStart]
    );
  }

  /**
   * Get current count
   */
  static async getCount(workspaceId, windowStart) {
    const [rows] = await db.query(
      'SELECT request_count FROM rate_limits WHERE workspace_id = ? AND window_start = ?',
      [workspaceId, windowStart]
    );
    return rows[0] ? rows[0].request_count : 0;
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(olderThan) {
    const [result] = await db.query(
      'DELETE FROM rate_limits WHERE window_start < ?',
      [olderThan]
    );
    return result.affectedRows;
  }
}

module.exports = RateLimit;


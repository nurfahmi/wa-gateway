const db = require('../config/database');

class BroadcastMessage {
  /**
   * Create a new broadcast
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO broadcast_messages 
       (workspace_id, account_id, name, message, template_id, media_url, media_type,
        target_type, target_group_id, target_phone_numbers, status, scheduled_at, 
        total_recipients, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.account_id,
        data.name || null,
        data.message,
        data.template_id || null,
        data.media_url || null,
        data.media_type || null,
        data.target_type,
        data.target_group_id || null,
        data.target_phone_numbers ? JSON.stringify(data.target_phone_numbers) : null,
        data.status || 'draft',
        data.scheduled_at || null,
        data.total_recipients || 0,
        data.created_by || null
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM broadcast_messages WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].target_phone_numbers) {
      rows[0].target_phone_numbers = JSON.parse(rows[0].target_phone_numbers);
    }
    return rows[0];
  }

  /**
   * Find by workspace
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const { status, limit = 100, offset = 0 } = options;
    const safeLimit = parseInt(limit, 10) || 100;
    const safeOffset = parseInt(offset, 10) || 0;
    
    let query = 'SELECT * FROM broadcast_messages WHERE workspace_id = ?';
    const params = [workspaceId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Use query() with interpolated LIMIT/OFFSET - prepared statements have issues with these
    query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await db.query(query, params);
    return rows.map(row => {
      if (row.target_phone_numbers) {
        row.target_phone_numbers = JSON.parse(row.target_phone_numbers);
      }
      return row;
    });
  }

  /**
   * Find broadcasts ready to send
   */
  static async findReadyToSend(limit = 10) {
    // Use query() instead of execute() for LIMIT - prepared statements have issues with LIMIT in some MySQL versions
    const safeLimit = parseInt(limit, 10) || 10;
    const [rows] = await db.query(
      `SELECT bm.*, wa.account_identifier, wa.provider 
       FROM broadcast_messages bm
       JOIN whatsapp_accounts wa ON bm.account_id = wa.id
       WHERE bm.status = 'scheduled' 
       AND bm.scheduled_at <= NOW()
       AND wa.status = 'connected'
       ORDER BY bm.scheduled_at ASC
       LIMIT ${safeLimit}`
    );
    return rows.map(row => {
      if (row.target_phone_numbers) {
        row.target_phone_numbers = JSON.parse(row.target_phone_numbers);
      }
      return row;
    });
  }

  /**
   * Update broadcast
   */
  static async update(id, data) {
    const updates = [];
    const values = [];

    const fields = ['name', 'message', 'status', 'scheduled_at', 'started_at', 
                    'completed_at', 'total_recipients', 'sent_count', 'failed_count'];
    
    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.target_phone_numbers !== undefined) {
      updates.push('target_phone_numbers = ?');
      values.push(JSON.stringify(data.target_phone_numbers));
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.execute(
      `UPDATE broadcast_messages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Increment sent count
   */
  static async incrementSent(id) {
    await db.execute(
      'UPDATE broadcast_messages SET sent_count = sent_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Increment failed count
   */
  static async incrementFailed(id) {
    await db.execute(
      'UPDATE broadcast_messages SET failed_count = failed_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Mark as completed
   */
  static async markCompleted(id) {
    await db.execute(
      'UPDATE broadcast_messages SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', id]
    );
  }

  /**
   * Delete broadcast
   */
  static async delete(id) {
    await db.execute('DELETE FROM broadcast_messages WHERE id = ?', [id]);
  }
}

module.exports = BroadcastMessage;


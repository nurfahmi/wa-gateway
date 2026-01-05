const db = require('../config/database');

class Contact {
  /**
   * Create a new contact
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO contacts 
       (workspace_id, phone_number, name, email, tags, custom_fields, notes, is_blocked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.phone_number,
        data.name || null,
        data.email || null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.custom_fields ? JSON.stringify(data.custom_fields) : null,
        data.notes || null,
        data.is_blocked || false
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find contact by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    );
    if (rows[0]) {
      if (rows[0].tags) rows[0].tags = JSON.parse(rows[0].tags);
      if (rows[0].custom_fields) rows[0].custom_fields = JSON.parse(rows[0].custom_fields);
    }
    return rows[0];
  }

  /**
   * Find contact by workspace and phone number
   */
  static async findByPhone(workspaceId, phoneNumber) {
    const [rows] = await db.execute(
      'SELECT * FROM contacts WHERE workspace_id = ? AND phone_number = ?',
      [workspaceId, phoneNumber]
    );
    if (rows[0]) {
      if (rows[0].tags) rows[0].tags = JSON.parse(rows[0].tags);
      if (rows[0].custom_fields) rows[0].custom_fields = JSON.parse(rows[0].custom_fields);
    }
    return rows[0];
  }

  /**
   * Find or create contact
   */
  static async findOrCreate(workspaceId, phoneNumber, defaultData = {}) {
    let contact = await this.findByPhone(workspaceId, phoneNumber);
    
    if (!contact) {
      contact = await this.create({
        workspace_id: workspaceId,
        phone_number: phoneNumber,
        ...defaultData
      });
    }

    return contact;
  }

  /**
   * Find all contacts for workspace
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const { 
      search, 
      tags, 
      is_blocked, 
      limit = 100, 
      offset = 0,
      orderBy = 'last_message_at',
      orderDir = 'DESC'
    } = options;
    
    let query = 'SELECT * FROM contacts WHERE workspace_id = ?';
    const params = [workspaceId];

    if (search) {
      query += ' AND (name LIKE ? OR phone_number LIKE ? OR email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (tags && tags.length > 0) {
      query += ' AND JSON_OVERLAPS(tags, ?)';
      params.push(JSON.stringify(tags));
    }

    if (is_blocked !== undefined) {
      query += ' AND is_blocked = ?';
      params.push(is_blocked);
    }

    query += ` ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    return rows.map(row => {
      if (row.tags) row.tags = JSON.parse(row.tags);
      if (row.custom_fields) row.custom_fields = JSON.parse(row.custom_fields);
      return row;
    });
  }

  /**
   * Update contact
   */
  static async update(id, data) {
    const updates = [];
    const values = [];

    const fields = ['name', 'email', 'notes', 'is_blocked'];
    
    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }

    if (data.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(data.custom_fields));
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.execute(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Upsert contact (insert or update)
   */
  static async upsert(data) {
    const existing = await this.findByPhone(data.workspace_id, data.phone_number);
    
    if (existing) {
      // Update existing contact with new data
      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.profile_pic) updateData.custom_fields = { ...existing.custom_fields, profile_pic: data.profile_pic };
      if (data.account_id) updateData.custom_fields = { ...updateData.custom_fields, account_id: data.account_id };
      
      if (Object.keys(updateData).length > 0) {
        await this.update(existing.id, updateData);
      }
      return this.findById(existing.id);
    } else {
      // Create new contact
      const createData = {
        workspace_id: data.workspace_id,
        phone_number: data.phone_number,
        name: data.name || null,
        email: data.email || null,
        custom_fields: {}
      };
      
      if (data.profile_pic) createData.custom_fields.profile_pic = data.profile_pic;
      if (data.account_id) createData.custom_fields.account_id = data.account_id;
      
      return await this.create(createData);
    }
  }

  /**
   * Update message stats
   */
  static async updateMessageStats(workspaceId, phoneNumber) {
    await db.execute(
      `UPDATE contacts 
       SET message_count = message_count + 1, last_message_at = CURRENT_TIMESTAMP 
       WHERE workspace_id = ? AND phone_number = ?`,
      [workspaceId, phoneNumber]
    );
  }

  /**
   * Delete contact
   */
  static async delete(id) {
    await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
  }

  /**
   * Get contact statistics
   */
  static async getStats(workspaceId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total_contacts,
        SUM(CASE WHEN is_blocked = TRUE THEN 1 ELSE 0 END) as blocked_contacts,
        SUM(CASE WHEN last_message_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_contacts_7d,
        SUM(CASE WHEN last_message_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as active_contacts_30d
       FROM contacts 
       WHERE workspace_id = ?`,
      [workspaceId]
    );
    return rows[0];
  }
}

module.exports = Contact;


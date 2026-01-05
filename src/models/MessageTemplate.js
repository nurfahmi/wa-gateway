const db = require('../config/database');

class MessageTemplate {
  /**
   * Create a new template
   */
  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO message_templates 
       (workspace_id, name, content, category, variables, media_url, media_type, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.workspace_id,
        data.name,
        data.content,
        data.category || null,
        data.variables ? JSON.stringify(data.variables) : null,
        data.media_url || null,
        data.media_type || null,
        data.is_favorite || false
      ]
    );
    return this.findById(result.insertId);
  }

  /**
   * Find template by ID
   */
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM message_templates WHERE id = ?',
      [id]
    );
    if (rows[0] && rows[0].variables) {
      rows[0].variables = JSON.parse(rows[0].variables);
    }
    return rows[0];
  }

  /**
   * Find all templates for workspace
   */
  static async findByWorkspace(workspaceId, options = {}) {
    const { category, favorite, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM message_templates WHERE workspace_id = ?';
    const params = [workspaceId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (favorite) {
      query += ' AND is_favorite = TRUE';
    }

    query += ' ORDER BY is_favorite DESC, usage_count DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    return rows.map(row => {
      if (row.variables) {
        row.variables = JSON.parse(row.variables);
      }
      return row;
    });
  }

  /**
   * Update template
   */
  static async update(id, data) {
    const updates = [];
    const values = [];

    const fields = ['name', 'content', 'category', 'media_url', 'media_type', 'is_favorite'];
    
    fields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (data.variables !== undefined) {
      updates.push('variables = ?');
      values.push(JSON.stringify(data.variables));
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.execute(
      `UPDATE message_templates SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete template
   */
  static async delete(id) {
    await db.execute('DELETE FROM message_templates WHERE id = ?', [id]);
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(id) {
    await db.execute(
      'UPDATE message_templates SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  /**
   * Render template with variables
   */
  static render(template, variables = {}) {
    let rendered = template.content;
    
    // Replace {{variable}} with actual values
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, variables[key]);
    });

    return rendered;
  }

  /**
   * Extract variables from template content
   */
  static extractVariables(content) {
    const regex = /{{\\s*([a-zA-Z0-9_]+)\\s*}}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }
}

module.exports = MessageTemplate;


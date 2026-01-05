const db = require('../config/database');
const crypto = require('../utils/crypto');

class WhatsAppAccount {
  /**
   * Find by ID
   */
  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM whatsapp_accounts WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }


  /**
   * Find by account identifier
   */
  static async findByIdentifier(identifier) {
    const [rows] = await db.query(
      'SELECT * FROM whatsapp_accounts WHERE account_identifier = ?',
      [identifier]
    );
    return rows[0] || null;
  }

  /**
   * Find by external device ID (Baileys device ID)
   */
  static async findByExternalDeviceId(externalDeviceId) {
    const [rows] = await db.query(
      'SELECT * FROM whatsapp_accounts WHERE external_device_id = ?',
      [externalDeviceId]
    );
    return rows[0] || null;
  }

  /**
   * Find by phone number
   */
  static async findByPhoneNumber(phoneNumber) {
    const [rows] = await db.query(
      'SELECT * FROM whatsapp_accounts WHERE phone_number = ?',
      [phoneNumber]
    );
    return rows[0] || null;
  }

  /**
   * Find by workspace
   */
  static async findByWorkspace(workspaceId, filters = {}) {
    let query = 'SELECT * FROM whatsapp_accounts WHERE workspace_id = ?';
    const params = [workspaceId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.provider) {
      query += ' AND provider = ?';
      params.push(filters.provider);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count accounts by workspace
   */
  static async countByWorkspace(workspaceId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM whatsapp_accounts WHERE workspace_id = ?';
    const params = [workspaceId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const [rows] = await db.query(query, params);
    return rows[0].count;
  }

  /**
   * Create account
   */
  static async create(data) {
    // Note: Device API key will be set later by Baileys service during initialization
    // We no longer auto-generate device API keys here

    const [result] = await db.query(
      'INSERT INTO whatsapp_accounts SET ?',
      [data]
    );
    
    return await this.findById(result.insertId);
  }

  /**
   * Update account
   */
  static async update(id, data) {
    await db.query(
      'UPDATE whatsapp_accounts SET ? WHERE id = ?',
      [data, id]
    );
    return this.findById(id);
  }

  /**
   * Update status
   */
  static async updateStatus(id, status, phoneNumber = null) {
    const data = { status };
    if (phoneNumber) {
      data.phone_number = phoneNumber;
    }
    if (status === 'connected') {
      data.last_connected_at = new Date();
    }
    return this.update(id, data);
  }

  /**
   * Update QR code
   */
  static async updateQR(id, qrCode, expiresAt) {
    return this.update(id, {
      qr_code: qrCode,
      qr_expires_at: expiresAt
    });
  }

  /**
   * Update external device ID
   */
  static async updateExternalDeviceId(id, externalDeviceId) {
    return this.update(id, {
      external_device_id: externalDeviceId
    });
  }

  /**
   * Update account identifier (sessionId from Baileys)
   */
  static async updateAccountIdentifier(id, accountIdentifier) {
    return this.update(id, {
      account_identifier: accountIdentifier
    });
  }


  /**
   * Delete account
   */
  static async delete(id) {
    const [result] = await db.query(
      'DELETE FROM whatsapp_accounts WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Find account with workspace info
   */
  static async findWithWorkspace(id) {
    const [rows] = await db.query(
      `SELECT a.*, w.name as workspace_name, w.subscription_tier 
       FROM whatsapp_accounts a
       JOIN workspaces w ON a.workspace_id = w.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }



}

module.exports = WhatsAppAccount;


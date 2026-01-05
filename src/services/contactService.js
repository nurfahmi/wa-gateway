const Contact = require('../models/Contact');
const logger = require('../utils/logger');

class ContactService {
  /**
   * Create a new contact
   */
  async createContact(workspaceId, data) {
    return await Contact.create({
      workspace_id: workspaceId,
      ...data
    });
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId) {
    return await Contact.findById(contactId);
  }

  /**
   * Get contact by phone number
   */
  async getContactByPhone(workspaceId, phoneNumber) {
    return await Contact.findByPhone(workspaceId, phoneNumber);
  }

  /**
   * Find or create contact
   */
  async findOrCreateContact(workspaceId, phoneNumber, defaultData = {}) {
    return await Contact.findOrCreate(workspaceId, phoneNumber, defaultData);
  }

  /**
   * Get all contacts for workspace
   */
  async getContacts(workspaceId, options = {}) {
    return await Contact.findByWorkspace(workspaceId, options);
  }

  /**
   * Update contact
   */
  async updateContact(contactId, data) {
    return await Contact.update(contactId, data);
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId) {
    return await Contact.delete(contactId);
  }

  /**
   * Block contact
   */
  async blockContact(contactId) {
    return await Contact.update(contactId, { is_blocked: true });
  }

  /**
   * Unblock contact
   */
  async unblockContact(contactId) {
    return await Contact.update(contactId, { is_blocked: false });
  }

  /**
   * Add tags to contact
   */
  async addTags(contactId, tags) {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const existingTags = contact.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    return await Contact.update(contactId, { tags: newTags });
  }

  /**
   * Remove tags from contact
   */
  async removeTags(contactId, tags) {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const existingTags = contact.tags || [];
    const newTags = existingTags.filter(tag => !tags.includes(tag));

    return await Contact.update(contactId, { tags: newTags });
  }

  /**
   * Update custom fields
   */
  async updateCustomFields(contactId, fields) {
    const contact = await Contact.findById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const existingFields = contact.custom_fields || {};
    const newFields = { ...existingFields, ...fields };

    return await Contact.update(contactId, { custom_fields: newFields });
  }

  /**
   * Get contact statistics
   */
  async getStats(workspaceId) {
    return await Contact.getStats(workspaceId);
  }

  /**
   * Update message statistics for contact
   */
  async updateMessageStats(workspaceId, phoneNumber) {
    return await Contact.updateMessageStats(workspaceId, phoneNumber);
  }

  /**
   * Import contacts from array
   */
  async importContacts(workspaceId, contacts) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const contactData of contacts) {
      try {
        await this.findOrCreateContact(
          workspaceId,
          contactData.phone_number,
          contactData
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: contactData.phone_number,
          error: error.message
        });
        logger.error(`Error importing contact ${contactData.phone_number}:`, error);
      }
    }

    return results;
  }

  /**
   * Export contacts to array
   */
  async exportContacts(workspaceId, options = {}) {
    return await Contact.findByWorkspace(workspaceId, {
      ...options,
      limit: 10000 // Large limit for export
    });
  }
}

module.exports = new ContactService();


/**
 * WhatsApp Provider Interface
 * All WhatsApp providers must implement this interface
 */
class WhatsAppProvider {
  /**
   * Initialize a new WhatsApp account/device
   * @param {Object} config - Provider-specific configuration
   * @returns {Promise<Object>} - { accountId, qrCode?, status, phoneNumber? }
   */
  async initialize(config) {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Send a text message
   * @param {string} accountIdentifier - Internal account identifier
   * @param {string} recipient - Phone number (E.164 format)
   * @param {string} text - Message content
   * @returns {Promise<Object>} - { messageId, status }
   */
  async sendText(accountIdentifier, recipient, text) {
    throw new Error('Method sendText() must be implemented');
  }

  /**
   * Send a media message
   * @param {string} accountIdentifier
   * @param {string} recipient
   * @param {Object} media - { type: 'image'|'document'|'video', url: string, caption?: string, fileName?: string }
   * @returns {Promise<Object>} - { messageId, status }
   */
  async sendMedia(accountIdentifier, recipient, media) {
    throw new Error('Method sendMedia() must be implemented');
  }

  /**
   * Get account status
   * @param {string} accountIdentifier
   * @returns {Promise<Object>} - { status: 'connected'|'disconnected'|'connecting', phoneNumber?: string }
   */
  async getStatus(accountIdentifier) {
    throw new Error('Method getStatus() must be implemented');
  }

  /**
   * Disconnect account
   * @param {string} accountIdentifier
   * @returns {Promise<void>}
   */
  async disconnect(accountIdentifier) {
    throw new Error('Method disconnect() must be implemented');
  }

  /**
   * Setup event listeners for incoming messages
   * @param {string} accountIdentifier
   * @param {Function} onEvent - Callback for normalized events
   * @returns {Promise<void>}
   */
  async setupEventListeners(accountIdentifier, onEvent) {
    throw new Error('Method setupEventListeners() must be implemented');
  }

  /**
   * Get QR code for account (if applicable)
   * @param {string} accountIdentifier
   * @returns {Promise<string|null>} - QR code string or null
   */
  async getQRCode(accountIdentifier) {
    throw new Error('Method getQRCode() must be implemented');
  }
}

module.exports = WhatsAppProvider;


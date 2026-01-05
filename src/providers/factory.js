const BaileysHttpProvider = require('./baileys/BaileysHttpProvider');
const config = require('../config');
// const OfficialProvider = require('./official/OfficialProvider'); // Phase 3

/**
 * Provider Factory
 * Creates appropriate provider instance based on type
 */
class ProviderFactory {
  /**
   * Create provider instance
   * @param {string} providerType - 'baileys' | 'official'
   * @returns {WhatsAppProvider} Provider instance
   */
  static create(providerType) {
    switch (providerType) {
      case 'baileys':
        // Always use HTTP provider (calls external Baileys service)
        return new BaileysHttpProvider();
      
      // Phase 3: Official WhatsApp Cloud API
      // case 'official':
      //   return new OfficialProvider();
      
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  /**
   * Get supported provider types
   * @returns {Array<string>}
   */
  static getSupportedProviders() {
    return ['baileys']; // Add 'official' in Phase 3
  }

  /**
   * Check if provider is supported
   * @param {string} providerType
   * @returns {boolean}
   */
  static isSupported(providerType) {
    return this.getSupportedProviders().includes(providerType);
  }
}

module.exports = ProviderFactory;


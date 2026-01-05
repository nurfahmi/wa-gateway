const response = require('../utils/response');
const logger = require('../utils/logger');

class BusinessTemplateController {
  /**
   * Get all business templates
   */
  async getAllTemplates(req, res) {
    try {
      const { businessType, language } = req.query;

      // For now, return mock data - in a real implementation,
      // this would fetch from a database or external service
      const templates = [
        {
          id: 1,
          businessType: 'ecommerce',
          language: 'id',
          botName: 'Asisten Penjualan Digital',
          prompt: 'Anda adalah AI customer service untuk toko online...',
          productKnowledge: 'Katalog produk lengkap...',
          salesScripts: 'Skrip penjualan terstruktur...',
          businessRules: 'Kebijakan toko...',
          triggers: '@shop, @beli, @harga',
          customerSegmentation: { vip: 'Pelanggan VIP', regular: 'Pelanggan biasa' },
          upsellStrategies: { bundle_deals: 'Penawaran paket' },
          objectionHandling: { price: 'Penanganan keberatan harga' },
          faqResponses: { shipping: 'Info pengiriman', return: 'Kebijakan retur' },
          isActive: true,
          version: '1.0'
        },
        {
          id: 2,
          businessType: 'restaurant',
          language: 'id',
          botName: 'Asisten Restoran Digital',
          prompt: 'Anda adalah AI untuk restoran...',
          isActive: true,
          version: '1.0'
        }
      ];

      let filteredTemplates = templates;

      if (businessType) {
        filteredTemplates = filteredTemplates.filter(t => t.businessType === businessType);
      }

      if (language) {
        filteredTemplates = filteredTemplates.filter(t => t.language === language);
      }

      return response.success(res, { templates: filteredTemplates }, 'Templates retrieved successfully');
    } catch (error) {
      logger.error('Get all templates error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Get business types
   */
  async getBusinessTypes(req, res) {
    try {
      const businessTypes = [
        'automotive',
        'beauty',
        'ecommerce',
        'education',
        'finance',
        'healthcare',
        'real-estate',
        'restaurant',
        'travel'
      ];

      return response.success(res, { businessTypes }, 'Business types retrieved successfully');
    } catch (error) {
      logger.error('Get business types error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Get specific template
   */
  async getTemplate(req, res) {
    try {
      const { businessType, language } = req.params;

      // Mock template data - in real implementation, fetch from database
      const templates = {
        'ecommerce': {
          'id': {
            id: 1,
            businessType: 'ecommerce',
            language: 'id',
            botName: 'Asisten Penjualan Digital',
            prompt: 'Anda adalah AI customer service untuk toko online...',
            productKnowledge: 'Katalog produk lengkap...',
            salesScripts: 'Skrip penjualan terstruktur...',
            businessRules: 'Kebijakan toko...',
            triggers: '@shop, @beli, @harga',
            customerSegmentation: { vip: 'Pelanggan VIP', regular: 'Pelanggan biasa' },
            upsellStrategies: { bundle_deals: 'Penawaran paket' },
            objectionHandling: { price: 'Penanganan keberatan harga' },
            faqResponses: { shipping: 'Info pengiriman', return: 'Kebijakan retur' }
          },
          'en': {
            id: 2,
            businessType: 'ecommerce',
            language: 'en',
            botName: 'Digital Sales Assistant',
            prompt: 'You are an AI customer service for online store...',
            productKnowledge: 'Complete product catalog...',
            salesScripts: 'Structured sales scripts...',
            businessRules: 'Store policies...',
            triggers: '@shop, @buy, @price'
          }
        },
        'restaurant': {
          'id': {
            id: 3,
            businessType: 'restaurant',
            language: 'id',
            botName: 'Asisten Restoran Digital',
            prompt: 'Anda adalah AI untuk restoran...',
            productKnowledge: 'Menu restoran...',
            salesScripts: 'Skrip pemesanan...',
            businessRules: 'Kebijakan restoran...',
            triggers: '@menu, @pesan, @reservasi'
          }
        }
      };

      const template = templates[businessType]?.[language || 'id'];

      if (!template) {
        return response.notFound(res, 'Business template');
      }

      return response.success(res, { template }, 'Template retrieved successfully');
    } catch (error) {
      logger.error('Get template error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Create or update template
   */
  async upsertTemplate(req, res) {
    try {
      const { businessType, language } = req.params;
      const templateData = req.body;

      // Validate required fields
      if (!templateData.botName || !templateData.prompt) {
        return response.error(res, 'botName and prompt are required', 400);
      }

      // Mock implementation - in real app, save to database
      const template = {
        id: Date.now(), // Mock ID
        businessType,
        language,
        ...templateData,
        isActive: templateData.isActive !== false,
        version: templateData.version || '1.0',
        updatedAt: new Date()
      };

      return response.success(res, { template }, 'Template saved successfully');
    } catch (error) {
      logger.error('Upsert template error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(req, res) {
    try {
      const { businessType, language } = req.params;

      // Mock implementation - in real app, delete from database
      // Check if template exists
      const exists = (businessType === 'ecommerce' && ['id', 'en'].includes(language)) ||
                     (businessType === 'restaurant' && language === 'id');

      if (!exists) {
        return response.notFound(res, 'Business template');
      }

      return response.success(res, null, 'Template deleted successfully');
    } catch (error) {
      logger.error('Delete template error:', error);
      return response.error(res, error.message, 500);
    }
  }
}

module.exports = new BusinessTemplateController();

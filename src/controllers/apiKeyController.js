const ApiKey = require('../models/ApiKey');
const response = require('../utils/response');
const logger = require('../utils/logger');

class ApiKeyController {
  /**
   * Create API key
   */
  async create(req, res) {
    try {
      const { name } = req.body;

      const result = await ApiKey.create(req.workspace.id, name);

      return response.success(res, {
        id: result.id,
        apiKey: result.apiKey, // Only shown once!
        prefix: result.prefix,
        name: name || null,
        message: 'IMPORTANT: Save this API key securely. It will not be shown again.'
      }, 'API key created successfully', 201);
    } catch (error) {
      logger.error('Create API key error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * List API keys
   */
  async list(req, res) {
    try {
      const keys = await ApiKey.findByWorkspace(req.workspace.id);

      return response.success(res, keys);
    } catch (error) {
      logger.error('List API keys error:', error);
      return response.error(res, error.message, 500);
    }
  }

  /**
   * Revoke API key
   */
  async revoke(req, res) {
    try {
      const keyId = parseInt(req.params.id);

      // Verify key belongs to workspace
      const key = await ApiKey.findById(keyId);
      if (!key || key.workspace_id !== req.workspace.id) {
        return response.notFound(res, 'API key');
      }

      await ApiKey.revoke(keyId);

      return response.success(res, null, 'API key revoked successfully');
    } catch (error) {
      logger.error('Revoke API key error:', error);
      return response.error(res, error.message, 400);
    }
  }

  /**
   * Delete API key
   */
  async delete(req, res) {
    try {
      const keyId = parseInt(req.params.id);

      // Verify key belongs to workspace
      const key = await ApiKey.findById(keyId);
      if (!key || key.workspace_id !== req.workspace.id) {
        return response.notFound(res, 'API key');
      }

      await ApiKey.delete(keyId);

      return response.success(res, null, 'API key deleted successfully');
    } catch (error) {
      logger.error('Delete API key error:', error);
      return response.error(res, error.message, 400);
    }
  }
}

module.exports = new ApiKeyController();


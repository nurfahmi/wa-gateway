const axios = require('axios');
const config = require('./index');
const { retryWithBackoff, shouldRetryOAuthError } = require('../utils/retry');
const logger = require('../utils/logger');

// Create axios instance with timeout
const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

class OAuthClient {
  constructor() {
    this.serverUrl = config.oauth.serverUrl;
    this.clientId = config.oauth.clientId;
    this.clientSecret = config.oauth.clientSecret;
    this.redirectUri = config.oauth.redirectUri;
  }

  /**
   * Get authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'profile email subscriptions',
      state: state
    });
    
    return `${this.serverUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code) {
    return retryWithBackoff(
      async () => {
        const response = await axiosInstance.post(`${this.serverUrl}/oauth/token`, {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        });

        return response.data;
      },
      {
        maxRetries: 3,
        initialDelay: 200,
        maxDelay: 2000,
        shouldRetry: shouldRetryOAuthError
      }
    ).catch(error => {
      logger.error('Token exchange failed after retries:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error('Failed to exchange code for token: ' + error.message);
    });
  }

  /**
   * Introspect token to validate and get user info
   */
  async introspectToken(token) {
    return retryWithBackoff(
      async () => {
        const response = await axiosInstance.post(`${this.serverUrl}/oauth/introspect`, {
          token: token
        });

        return response.data;
      },
      {
        maxRetries: 3,
        initialDelay: 200,
        maxDelay: 2000,
        shouldRetry: shouldRetryOAuthError
      }
    ).catch(error => {
      logger.error('Token introspection failed after retries:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error('Token introspection failed: ' + error.message);
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    return retryWithBackoff(
      async () => {
        const response = await axiosInstance.post(`${this.serverUrl}/oauth/token`, {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        });

        return response.data;
      },
      {
        maxRetries: 3,
        initialDelay: 200,
        maxDelay: 2000,
        shouldRetry: shouldRetryOAuthError
      }
    ).catch(error => {
      logger.error('Token refresh failed after retries:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error('Token refresh failed: ' + error.message);
    });
  }

  /**
   * Revoke token
   * Note: Errors are logged but not thrown - token may already be invalid
   */
  async revokeToken(token) {
    try {
      await axiosInstance.post(`${this.serverUrl}/oauth/revoke`, {
        token: token
      }, {
        timeout: 5000 // Shorter timeout for revocation
      });
    } catch (error) {
      // Log but don't throw - token may already be invalid or revoked
      logger.warn('Token revocation failed (non-critical):', {
        message: error.message,
        status: error.response?.status
      });
    }
  }
}

module.exports = new OAuthClient();


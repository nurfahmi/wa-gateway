const logger = require('./logger');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 2000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry all)
 * @returns {Promise} - Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 2000,
    shouldRetry = () => true
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error shouldn't be retried (e.g., 4xx errors except 429)
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Log retry attempt
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms:`, {
        error: error.message,
        status: error.response?.status
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff with jitter
      delay = Math.min(delay * 2, maxDelay);
      delay = delay + Math.random() * 100; // Add jitter
    }
  }

  throw lastError;
}

/**
 * Determine if an error should be retried
 * Retries: network errors, 5xx errors, 429 (rate limit), timeouts
 * Doesn't retry: 4xx errors (except 429)
 */
function shouldRetryOAuthError(error) {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Retry on server errors (5xx)
  if (status >= 500) {
    return true;
  }

  // Retry on rate limiting (429)
  if (status === 429) {
    return true;
  }

  // Retry on timeout (408)
  if (status === 408) {
    return true;
  }

  // Don't retry on client errors (4xx except above)
  return false;
}

module.exports = {
  retryWithBackoff,
  shouldRetryOAuthError
};


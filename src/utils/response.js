/**
 * Send success response
 */
function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * Send error response
 */
function error(res, message, statusCode = 400, errors = null) {
  const response = {
    success: false,
    error: message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
function paginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  });
}

/**
 * Send not found response
 */
function notFound(res, resource = 'Resource') {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  });
}

/**
 * Send unauthorized response
 */
function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({
    success: false,
    error: message
  });
}

/**
 * Send forbidden response
 */
function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({
    success: false,
    error: message
  });
}

/**
 * Send validation error response
 */
function validationError(res, errors) {
  return res.status(422).json({
    success: false,
    error: 'Validation failed',
    errors
  });
}

module.exports = {
  success,
  error,
  paginated,
  notFound,
  unauthorized,
  forbidden,
  validationError
};


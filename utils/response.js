/**
 * Build a consistent response format
 */
exports.successResponse = (res, message, data = {}, code = 200) => {
    return res.status(code).json({
      status: 'success',
      statusCode: code,
      message,
      data
    });
  };
  
  exports.errorResponse = (res, message, code = 400, details = {}) => {
    return res.status(code).json({
      status: 'error',
      statusCode: code,
      message,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    });
  };
  
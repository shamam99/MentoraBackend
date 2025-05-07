/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);
  
    const statusCode = err.statusCode || 500;
  
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message: err.message || 'Internal Server Error',
      requestId: req.headers['x-request-id'] || null,
      error: {
        code: statusCode,
        message: err.message,
        details: err.details || null,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      }
    });
  };
  
  module.exports = errorHandler;
  
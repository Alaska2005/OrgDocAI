// src/middleware/error.middleware.js
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  
  // Log with context
  console.error(`[ERROR] ${status} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Don't expose sensitive error details in production
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'An error occurred. Please try again later.';

  res.status(status).json({
    error: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    }),
  });
};

module.exports = { errorHandler };

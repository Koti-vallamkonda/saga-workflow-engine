// Global error-handling middleware for the Express application
const errorHandler = (err, req, res, next) => {

  // Log the error message in the server console for debugging
  console.error(err.message);


 // Send an appropriate HTTP status code and error message
  // Default to 500 if no status code is provided 
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
};


// Export middleware so it can be used throughout the application
module.exports = errorHandler;
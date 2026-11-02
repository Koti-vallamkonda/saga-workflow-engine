
// Import the Tenant model to interact with the tenants collection
const Tenant = require('../models/Tenant');

// Middleware to identify and validate the tenant for each request
const tenantMiddleware = async (req, res, next) => {
  try {
    // Get the tenant slug from the request headers
    const slug = req.headers['x-tenant-id'];

    // Check if the tenant ID header is provided
    if (!slug) {
      return res.status(400).json({ message: 'x-tenant-id header is required' });
    }

    // Find the tenant in the database using the lowercase slug
    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });

    // Return an error if the tenant does not exist
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Check whether the tenant account is active
    if (!tenant.isActive) {
      return res.status(403).json({ message: 'Tenant is disabled' });
    }

    // Attach tenant information to the request object
    req.tenant = tenant;

    // Pass control to the next middleware or route handler
    next();
  } catch (err) {
    // Forward any unexpected errors to the error-handling middleware
    next(err);
  }
};

// Export the middleware so it can be used in other files
module.exports = tenantMiddleware;


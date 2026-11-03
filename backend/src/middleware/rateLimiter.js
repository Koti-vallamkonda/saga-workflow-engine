// Import express-rate-limit to prevent excessive API requests
const rateLimit = require('express-rate-limit');

// Define request limits for different subscription plans
const limits = {

  // Free plan: Maximum 100 requests per minute (configurable through .env)
  free: Number(process.env.RATE_LIMIT_FREE) || 100,

  // Pro plan: Maximum 1000 requests per minute (configurable through .env)
  pro: Number(process.env.RATE_LIMIT_PRO) || 1000,

};

// Configure rate limiter for tenant-based request control
const rateLimiter = rateLimit({

  // Set the rate limiting window to 1 minute
  windowMs: 60 * 1000,

  // Apply request limits according to the tenant's subscription plan
  // If the plan is not found, use the free plan limit
  limit: (req) => limits[req.tenant.plan] || limits.free,

  // Use tenant ID as the unique key so each tenant has a separate request counter
  keyGenerator: (req) => String(req.tenant._id),

  // Include rate limit information in response headers
  standardHeaders: true,

  // Disable older X-RateLimit headers
  legacyHeaders: false,

  // Return this message when a tenant exceeds its request limit
  message: { message: 'Too many requests; please try again later' },

});

// Export the configured rate limiter for use in routes or middleware
module.exports = rateLimiter;
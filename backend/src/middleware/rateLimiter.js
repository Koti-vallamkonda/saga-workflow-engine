const rateLimit = require('express-rate-limit');

const limits = {
  free: Number(process.env.RATE_LIMIT_FREE) || 100,
  pro: Number(process.env.RATE_LIMIT_PRO) || 1000,
};

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: (req) => limits[req.tenant.plan] || limits.free,
  keyGenerator: (req) => String(req.tenant._id), // each tenant gets its own counter
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests; please try again later' },
});

module.exports = rateLimiter;
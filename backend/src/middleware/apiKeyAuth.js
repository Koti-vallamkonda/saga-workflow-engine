const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { hashKey } = require('../utils/apiKey');

// Middleware to authenticate incoming requests using API keys.
const apiKeyAuth = async (req, res, next) => {
  try {
    // Retrieve the API key from the request headers.
    const raw = req.headers['x-api-key'];

    // Return an unauthorized response if the API key is missing.
    if (!raw) return res.status(401).json({ message: 'x-api-key header is required' });

    // Find active API keys matching the current tenant and key prefix.
    const candidates = await ApiKey.find({
      tenantId: req.tenant._id,
      prefix: raw.slice(0, 12),
      revoked: false,
    });

    // Hash the incoming API key and convert it into a buffer for comparison.
    const incoming = Buffer.from(hashKey(raw), 'hex');

    // Find a matching key using a timing-safe comparison.
    const match = candidates.find((k) => {
      const stored = Buffer.from(k.keyHash, 'hex');
      return stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);
    });

    // Reject the request if no matching API key is found.
    if (!match) return res.status(401).json({ message: 'Invalid API key' });

    // Check whether the API key has passed its expiration date.
    if (match.expiresAt && match.expiresAt < new Date()) {
      return res.status(401).json({ message: 'API key expired' });
    }

    // Update the last-used timestamp for the authenticated API key.
    match.lastUsedAt = new Date();
    await match.save();

    // Attach the authenticated API key to the request object.
    req.apiKey = match;

    // Pass control to the next middleware or route handler.
    next();
  } catch (err) {
    // Forward any errors to the centralized error-handling middleware.
    next(err);
  }
};

module.exports = apiKeyAuth;

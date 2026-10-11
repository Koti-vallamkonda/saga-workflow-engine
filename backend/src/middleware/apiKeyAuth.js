const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { hashKey } = require('../utils/apiKey');

const apiKeyAuth = async (req, res, next) => {
  try {
    const raw = req.headers['x-api-key'];
    if (!raw) return res.status(401).json({ message: 'x-api-key header is required' });

    const candidates = await ApiKey.find({
      tenantId: req.tenant._id,
      prefix: raw.slice(0, 12),
      revoked: false,
    });

    const incoming = Buffer.from(hashKey(raw), 'hex');
    const match = candidates.find((k) => {
      const stored = Buffer.from(k.keyHash, 'hex');
      return stored.length === incoming.length && crypto.timingSafeEqual(stored, incoming);
    });

    if (!match) return res.status(401).json({ message: 'Invalid API key' });

    if (match.expiresAt && match.expiresAt < new Date()) {
      return res.status(401).json({ message: 'API key expired' });
    }

    match.lastUsedAt = new Date();
    await match.save();

    req.apiKey = match;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = apiKeyAuth;
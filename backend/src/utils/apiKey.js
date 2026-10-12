const crypto = require('crypto');

const hashKey = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const generateApiKey = () => {
  const raw = 'wfk_' + crypto.randomBytes(32).toString('hex');
  return { raw, prefix: raw.slice(0, 12), keyHash: hashKey(raw) };
};

module.exports = { generateApiKey, hashKey };
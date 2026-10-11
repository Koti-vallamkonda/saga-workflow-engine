const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    prefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true },
    revoked: { type: Boolean, default: false },
    lastUsedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
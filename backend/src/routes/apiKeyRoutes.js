const express = require('express');
const ApiKey = require('../models/ApiKey');
const { generateApiKey } = require('../utils/apiKey');

const router = express.Router();

// Create a new key (the original key is shown only once)
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    const { raw, prefix, keyHash } = generateApiKey();
    const doc = await ApiKey.create({ tenantId: req.tenant._id, name, prefix, keyHash });
    res.status(201).json({
      id: doc._id,
      name: doc.name,
      apiKey: raw,
      message: 'Copy this key now; it will not be shown again',
    });
  } catch (err) {
    next(err);
  }
});

// List this tenant's keys (the hash is not shown)
router.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ tenantId: req.tenant._id }).select('-keyHash');
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

// Revoke (disable) a key
router.delete('/:id', async (req, res, next) => {
  try {
    const key = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { revoked: true },
      { new: true }
    );
    if (!key) return res.status(404).json({ message: 'API key not found' });
    res.json({ message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
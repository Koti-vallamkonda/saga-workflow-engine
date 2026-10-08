const express = require('express');
const Tenant = require('../models/Tenant');

const router = express.Router();

// naya tenant (company) banao
router.post('/', async (req, res, next) => {
  try {
    const { name, slug, plan } = req.body;
    const tenant = await Tenant.create({ name, slug, plan });
    res.status(201).json(tenant);
  } catch (err) {
    next(err);
  }
});

// saare tenants dekho
router.get('/', async (req, res, next) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
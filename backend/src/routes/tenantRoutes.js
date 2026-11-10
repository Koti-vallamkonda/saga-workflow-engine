const express = require('express');
const Tenant = require('../models/Tenant');

const router = express.Router();

// Register a new tenant (company) in the system.
router.post('/', async (req, res, next) => {
  try {
    // Extract tenant details from the incoming request body.
    const { name, slug, plan } = req.body;

    // Create a new tenant record in the database.
    const tenant = await Tenant.create({ name, slug, plan });

    // Return the newly created tenant with HTTP 201 status.
    res.status(201).json(tenant);
  } catch (err) {
    // Forward errors to the centralized error-handling middleware.
    next(err);
  }
});

// Retrieve all registered tenants from the database.
router.get('/', async (req, res, next) => {
  try {
    // Fetch all tenant records stored in MongoDB.
    const tenants = await Tenant.find();

    // Return the list of tenants as a JSON response.
    res.json(tenants);
  } catch (err) {
    // Forward errors to the centralized error-handling middleware.
    next(err);
  }
});

module.exports = router;
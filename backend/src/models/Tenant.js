const mongoose = require('mongoose');

// Define the schema for tenant management in a multi-tenant application.
const tenantSchema = new mongoose.Schema(
  {
    // Stores the name of the tenant or organization.
    name: { type: String, required: true },

    // Stores a unique, lowercase identifier used to identify the tenant.
    slug: { type: String, required: true, unique: true, lowercase: true },

    // Defines the subscription plan available to the tenant.
    // Defaults to the free plan if no plan is specified.
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },

    // Determines whether the tenant is currently allowed to access the application.
    isActive: { type: Boolean, default: true },
  },
  {
    // Automatically maintains createdAt and updatedAt timestamps.
    timestamps: true,
  }
);

// Create and export the Tenant model for database operations.
module.exports = mongoose.model('Tenant', tenantSchema);
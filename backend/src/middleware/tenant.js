const Tenant = require('../models/Tenant');

const tenantMiddleware = async (req, res, next) => {
  try {
    const slug = req.headers['x-tenant-id'];

    if (!slug) {
      return res.status(400).json({ message: 'x-tenant-id header is required' });
    }

    const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (!tenant.isActive) {
      return res.status(403).json({ message: 'Tenant is disabled' });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = tenantMiddleware;
require('dotenv').config();

const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const Workflow = require('../src/models/Workflow');
const ApiKey = require('../src/models/ApiKey');
const { generateApiKey } = require('../src/utils/apiKey');

const tenants = [
  { name: 'Company A', slug: 'company-a', plan: 'free' },
  { name: 'Company B', slug: 'company-b', plan: 'pro' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const t of tenants) {
      // create the tenant, or update it if it already exists
      const tenant = await Tenant.findOneAndUpdate({ slug: t.slug }, t, { upsert: true, new: true });
      console.log(`Tenant ready: ${tenant.slug}`);

      // one sample workflow per tenant
      const hasWorkflow = await Workflow.findOne({ tenantId: tenant._id });
      if (!hasWorkflow) {
        await Workflow.create({ tenantId: tenant._id, name: `${t.name} sample workflow` });
        console.log('  sample workflow created');
      }

      // one API key per tenant (the real key can only be shown when it is created)
      const hasKey = await ApiKey.findOne({ tenantId: tenant._id, name: 'seed key' });
      if (!hasKey) {
        const { raw, prefix, keyHash } = generateApiKey();
        await ApiKey.create({ tenantId: tenant._id, name: 'seed key', prefix, keyHash });
        console.log(`  API key for ${tenant.slug}: ${raw}`);
      } else {
        console.log('  seed key already exists (its value is not shown again)');
      }
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
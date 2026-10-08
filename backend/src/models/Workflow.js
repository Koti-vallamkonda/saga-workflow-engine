const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    nodes: { type: Array, default: [] },
    edges: { type: Array, default: [] },
    status: { type: String, enum: ['draft', 'active'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workflow', workflowSchema);
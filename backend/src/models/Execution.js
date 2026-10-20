const mongoose = require('mongoose');
const { EXECUTION_STATES } = require('../services/executionStates');

const executionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    workflowName: { type: String, default: '' },
    // pending -> running -> completed | failed | compensating -> compensated | compensation_failed
    status: { type: String, enum: EXECUTION_STATES, default: 'pending', index: true },
    // how the run was started: { type: 'manual' } or { type: 'event', eventId, eventType }
    trigger: { type: Object, default: { type: 'manual' } },
    // data given to the run (manual input or the event payload)
    input: { type: Object, default: {} },
    // a copy of the execution graph taken when the run started, so later edits do not change a run
    graph: { type: Object, required: true },
    // one entry per node that was visited (see executionEngine.js for the shape)
    steps: { type: Array, default: [] },
    error: { type: String, default: null },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true, minimize: false }
);

// the newest runs of a tenant first
executionSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Execution', executionSchema);
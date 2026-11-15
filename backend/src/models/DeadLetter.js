const mongoose = require('mongoose');
// A run that ended badly is put here, so a person can look at it, replay it or close it.
const deadLetterSchema = new mongoose.Schema(
 {
 tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
 executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Execution', required: true, index: true },
 workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
 workflowName: { type: String, default: '' },
 // how the run ended: failed, compensated (rolled back) or compensation_failed
 finalStatus: { type: String, enum: ['failed', 'compensated', 'compensation_failed'], required: true },
 reason: { type: String, default: '' },
 // the step that failed: { nodeId, label, error, attempts, output }
 failedStep: { type: Object, default: null },
 // the input of the run, kept so it can be replayed
 input: { type: Object, default: {} },
 // open -> replayed (a new run was started) or resolved (closed by a person)
 status: { type: String, enum: ['open', 'replayed', 'resolved'], default: 'open', index: true },
 replayExecutionId: { type: mongoose.Schema.Types.ObjectId, default: null },
 note: { type: String, default: '' },
 },
 { timestamps: true, minimize: false }
);
deadLetterSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model('DeadLetter', deadLetterSchema);
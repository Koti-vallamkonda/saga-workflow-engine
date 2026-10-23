const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema(
 {
 tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
 // for example "order.created". Workflows listen for this value in their Trigger node.
 type: { type: String, required: true, trim: true },
 payload: { type: Object, default: {} },
 // received -> processing -> processed | failed
 status: {
 type: String,
 enum: ['received', 'processing', 'processed', 'failed'],
 default: 'received',
 index: true,
 },
 // the runs that were started because of this event
 executionIds: [{ type: mongoose.Schema.Types.ObjectId }],
 error: { type: String, default: null },
 processedAt: Date,
 },
 { timestamps: true, minimize: false }
);
eventSchema.index({ tenantId: 1, createdAt: -1 });
module.exports = mongoose.model('Event', eventSchema);
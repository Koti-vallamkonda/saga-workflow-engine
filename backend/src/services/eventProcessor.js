// Turns an event into workflow runs. The models and startExecution are passed in,
// so this file can be tested without a database.
function createEventProcessor({ Event, Workflow, startExecution, logger = console }) {
 async function processEvent(eventId) {
 // Claim the event. If another server already claimed it, this returns null,
 // so the same event is never processed twice, even with many servers.
 const event = await Event.findOneAndUpdate(
 { _id: eventId, status: 'received' },
 { status: 'processing' },
 { new: true }
 );
 if (!event) return null;
 // only ACTIVE workflows of the SAME tenant whose Trigger node listens for this event type
 const workflows = await Workflow.find({
 tenantId: event.tenantId,
 status: 'active',
 nodes: { $elemMatch: { type: 'trigger', 'data.eventType': event.type } },
 });
 const executionIds = [];
 const errors = [];
 for (const workflow of workflows) {
 try {
 const execution = await startExecution({
 tenantId: event.tenantId,
 workflow,
 input: event.payload || {},
 trigger: { type: 'event', eventId: event._id, eventType: event.type },
 });
 executionIds.push(execution._id);
 } catch (err) {
 errors.push(`${workflow.name}: ${err.message}`);
 }
 }
 event.executionIds = executionIds;
 event.error = errors.length ? errors.join('; ') : null;
 event.status = errors.length && executionIds.length === 0 ? 'failed' : 'processed';
 event.processedAt = new Date();
 await event.save();
 logger.log(`Event ${event._id} (${event.type}): started ${executionIds.length} run(s)`);
 return event;
 }
 // Safety net: process events that were saved but never picked up
 // (for example while the server was stopped, or after a change stream hiccup).
 async function recoverPending(olderThanMs = 5000) {
 const cutoff = new Date(Date.now() - olderThanMs);
 const pending = await Event.find({ status: 'received', createdAt: { $lt: cutoff } }).limit(100);
 for (const event of pending) {
 await processEvent(event._id);
 }
 return pending.length;
 }
 return { processEvent, recoverPending };
}
module.exports = { createEventProcessor };
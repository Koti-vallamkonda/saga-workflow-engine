// Listens to the MongoDB Change Stream of the events collection.
// Every new event wakes up the processor immediately (no polling needed).
// Change Streams need a replica set. MongoDB Atlas clusters are replica sets.
const Event = require('../models/Event');
const Workflow = require('../models/Workflow');
const { startExecution } = require('./executionService');
const { createEventProcessor } = require('./eventProcessor');
function startEventListener() {
 if (process.env.ENABLE_EVENT_LISTENER === 'false') {
 console.log('Event listener is switched off (ENABLE_EVENT_LISTENER=false)');
 return { close() {} };
 }
 const processor = createEventProcessor({ Event, Workflow, startExecution });
 let stream = null;
 let closed = false;
 let retryTimer = null;
 const scheduleReopen = () => {
 if (closed || retryTimer) return;
 retryTimer = setTimeout(() => {
 retryTimer = null;
 open();
 }, 5000);
 };
 function open() {
 try {
 stream = Event.watch([{ $match: { operationType: 'insert' } }]);
 } catch (err) {
 console.error('Could not open the change stream:', err.message);
 scheduleReopen();
 return;
 }
 console.log('Change stream is listening for new events');
 stream.on('change', (change) => {processor.processEvent(change.documentKey._id).catch((err) => {
 console.error('Could not process the event:', err.message);
 });
 });
 stream.on('error', (err) => {
 console.error('Change stream error:', err.message);
 if (/replica set|not supported/i.test(err.message)) {
 console.error(
 'Change streams need a replica set. MongoDB Atlas works. A plain local mongod does not.'
 );
 return;
 }
 Promise.resolve(stream.close()).catch(() => {});
 scheduleReopen();
 });
 }
 open();
 // pick up anything saved while the server was down, and re-check every 30 seconds
 processor.recoverPending().catch((err) => console.error('Recovery failed:', err.message));
 const timer = setInterval(() => {
 processor.recoverPending().catch((err) => console.error('Recovery failed:', err.message));
 }, 30000);
 timer.unref();
 return {
 close() {
 closed = true;
 clearInterval(timer);
 if (retryTimer) clearTimeout(retryTimer);
 if (stream) Promise.resolve(stream.close()).catch(() => {});
 },
 };
}
module.exports = { startEventListener };
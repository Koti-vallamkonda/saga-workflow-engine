// The dead-letter queue: runs that ended badly are saved here so nothing is lost silently.
// The models are passed in, so this file can be tested without a database.
const BAD_STATES = ['failed', 'compensated', 'compensation_failed'];
function problem(status, message) {
 const err = new Error(message);
 err.status = status;
 return err;
}
function createDeadLetterService({ DeadLetter, Workflow }) {
 // Called when a run is finished. Saves a dead letter if the run ended badly.
 // It is safe to call twice: there is only one dead letter per run.
 async function recordIfFailed(execution) {
 if (!BAD_STATES.includes(execution.status)) return null;
 const existing = await DeadLetter.findOne({ executionId: execution._id });
 if (existing) return existing;
 const steps = execution.steps || [];
 const failed = steps.find((s) => s.status === 'failed') || steps[steps.length - 1] || null;
 return DeadLetter.create({
 tenantId: execution.tenantId,
 executionId: execution._id,
 workflowId: execution.workflowId,
 workflowName: execution.workflowName || '',
 finalStatus: execution.status,
 reason: execution.error || 'The run ended with an error',
 failedStep: failed
 ? {
 nodeId: failed.nodeId,
 label: failed.label,
 error: failed.error,
 attempts: failed.attempts || 1,
 output: failed.output || null,
 }
 : null,
 input: execution.input || {},
 });
 }
 // Checks that a dead letter can be replayed and finds its workflow.
 async function prepareReplay(tenantId, id) {
 const letter = await DeadLetter.findOne({ _id: id, tenantId });
 if (!letter) throw problem(404, 'Dead letter not found');
 if (letter.status !== 'open') throw problem(409, 'Only open dead letters can be replayed');
 const workflow = await Workflow.findOne({ _id: letter.workflowId, tenantId });
 if (!workflow) throw problem(409, 'The workflow of this dead letter does not exist anymore');
 return { letter, workflow };
 }
 async function markReplayed(letter, execution) {
 letter.status = 'replayed';
 letter.replayExecutionId = execution._id;
 await letter.save();
 return letter;
 }
 async function resolve(tenantId, id, note) {
 const letter = await DeadLetter.findOne({ _id: id, tenantId });
 if (!letter) throw problem(404, 'Dead letter not found');
 if (letter.status === 'resolved') throw problem(409, 'This dead letter is already resolved');
 letter.status = 'resolved';
 letter.note = typeof note === 'string' ? note.slice(0, 500) : '';
 await letter.save();
 return letter;
 }
 return { recordIfFailed, prepareReplay, markReplayed, resolve };
}
// the real one, created the first time it is needed
let instance = null;
function defaultService() {
 if (!instance) {
 instance = createDeadLetterService({
 DeadLetter: require('../models/DeadLetter'),
 Workflow: require('../models/Workflow'),
 });
 }
 return instance;
}
module.exports = { createDeadLetterService, defaultService, BAD_STATES };
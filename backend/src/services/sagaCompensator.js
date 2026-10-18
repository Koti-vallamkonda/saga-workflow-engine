// The saga part: when a step fails, undo the steps that already finished,
// newest first, by calling the compensation url of each one.
const { withRetry } = require('./retry');
async function compensate(execution, deps) {
 const attempts = Number(process.env.COMPENSATION_ATTEMPTS) || 3;
 const baseMs = Number(process.env.COMPENSATION_BACKOFF_MS) || 500;
 // completed steps that know how to be undone, newest first
 const toUndo = execution.steps
 .filter((s) => s.status === 'completed' && s.compensation && s.compensation.url)
 .reverse();
 let ok = true;
 for (const step of toUndo) {
 step.status = 'compensating';
 step.compensation.status = 'running';
 await deps.save(execution);
 try {
 await withRetry(
 async (attempt) => {
 step.compensation.attempts = attempt;
 const res = await deps.callApi({
 url: step.compensation.url,
 method: step.compensation.method,
 body: {
 executionId: String(execution._id),
 nodeId: step.nodeId,
 label: step.label,
 original: step.output,
 input: execution.input,
 },
 headers: { 'x-execution-id': String(execution._id) },
 timeoutMs: deps.stepTimeoutMs,
 });
 if (res.status < 200 || res.status >= 300) {
 throw new Error(`HTTP ${res.status} from ${step.compensation.url}`);
 }
 },
 { attempts, baseMs, sleep: deps.sleep }
 );
 step.status = 'compensated';
 step.compensation.status = 'completed';
 step.compensation.error = null;
 } catch (err) {
 ok = false;
 step.status = 'compensation_failed';
 step.compensation.status = 'failed';
 step.compensation.error = err.message;
 }
 step.compensation.finishedAt = deps.now ? deps.now() : new Date();
 await deps.save(execution);
 }
 return { ok, undone: toUndo.length };
}
module.exports = { compensate };

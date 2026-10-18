const { compensate } = require('../services/sagaCompensator');
// a finished step that can be undone
const doneStep = (nodeId, undoUrl) => ({
 nodeId,
 label: `Step ${nodeId}`,
 status: 'completed',
 output: { status: 200, body: { id: nodeId } },
 compensation: undoUrl
 ? { url: undoUrl, method: 'POST', status: 'pending', attempts: 0, error: null }
 : null,
});
function makeDeps(replies = {}) {
 const calls = [];
 const sleeps = [];
 return {
 calls,
 sleeps,
 deps: {
 save: async () => {},
 callApi: async (req) => {
 calls.push(req);
 const reply = replies[req.url];
 if (typeof reply === 'function') return reply(calls.filter((c) => c.url === req.url).length);
 return reply || { status: 200, body: { ok: true } };
 },
 sleep: async (ms) => { sleeps.push(ms); },
 },
 };
}
describe('saga compensator', () => {
 test('undoes the completed steps in reverse order', async () => {
 const execution = {
 _id: 'x1',
 input: { a: 1 },
 steps: [doneStep('A', 'http://u/a'), doneStep('B', 'http://u/b'), doneStep('C', 'http://u/c')],
 };
 const { deps, calls } = makeDeps();
 const outcome = await compensate(execution, deps);
 expect(outcome.ok).toBe(true);
 expect(outcome.undone).toBe(3);
 expect(calls.map((c) => c.url)).toEqual(['http://u/c', 'http://u/b', 'http://u/a']);
 expect(execution.steps.map((s) => s.status)).toEqual(['compensated', 'compensated', 'compensated']);
 expect(execution.steps[0].compensation.status).toBe('completed');
 });
 test('sends what is needed to undo the step', async () => {
 const execution = { _id: 'x2', input: { orderId: 'A-1' }, steps: [doneStep('A', 'http://u/a')] };
 const { deps, calls } = makeDeps();
 await compensate(execution, deps);
 expect(calls[0].method).toBe('POST');
 expect(calls[0].body.executionId).toBe('x2');
 expect(calls[0].body.nodeId).toBe('A');
 expect(calls[0].body.original).toEqual({ status: 200, body: { id: 'A' } });
 expect(calls[0].body.input).toEqual({ orderId: 'A-1' });
 });
 test('skips steps that cannot be undone or did not complete', async () => {
 const failed = { ...doneStep('F', 'http://u/f'), status: 'failed' };
 const execution = {
 _id: 'x3',
 input: {},
 steps: [doneStep('A', 'http://u/a'), doneStep('B', null), failed],
 };
 const { deps, calls } = makeDeps();
 const outcome = await compensate(execution, deps);
 expect(outcome.undone).toBe(1);
 expect(calls.map((c) => c.url)).toEqual(['http://u/a']);
 expect(execution.steps[1].status).toBe('completed');
 expect(execution.steps[2].status).toBe('failed');
 });
 test('retries a failing undo call with backoff and then succeeds', async () => {
 const execution = { _id: 'x4', input: {}, steps: [doneStep('A', 'http://u/a')] };
 const { deps, calls, sleeps } = makeDeps({
 'http://u/a': (n) => (n < 3 ? { status: 503, body: null } : { status: 200, body: {} }),
 });
 const outcome = await compensate(execution, deps);
 expect(outcome.ok).toBe(true);
 expect(calls).toHaveLength(3);
 expect(sleeps).toEqual([500, 1000]);
 expect(execution.steps[0].compensation.attempts).toBe(3);
 expect(execution.steps[0].status).toBe('compensated');
 });
 test('marks compensation_failed when every attempt fails and still undoes the others', async () => {
 const execution = {
 _id: 'x5',
 input: {},
 steps: [doneStep('A', 'http://u/a'), doneStep('B', 'http://u/b')],
 };
 const { deps, calls } = makeDeps({ 'http://u/b': { status: 500, body: null } });
 const outcome = await compensate(execution, deps);
 expect(outcome.ok).toBe(false);
 expect(execution.steps[1].status).toBe('compensation_failed');
 expect(execution.steps[1].compensation.error).toBe('HTTP 500 from http://u/b');
 // B failed 3 times, then A was still undone
 expect(calls.filter((c) => c.url === 'http://u/b')).toHaveLength(3);
 expect(execution.steps[0].status).toBe('compensated');
 });
 test('a network error counts as a failed attempt', async () => {
 const execution = { _id: 'x6', input: {}, steps: [doneStep('A', 'http://u/a')] };
 const { deps } = makeDeps({ 'http://u/a': () => { throw new Error('connection refused'); } });
 const outcome = await compensate(execution, deps);
 expect(outcome.ok).toBe(false);
 expect(execution.steps[0].compensation.error).toBe('connection refused');
 });
});

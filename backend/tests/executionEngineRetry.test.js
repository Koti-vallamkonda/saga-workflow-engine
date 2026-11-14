const { runExecution } = require('../src/services/executionEngine');
const node = (id, type, config = {}) => ({ id, type, config });
const edge = (source, target, branch = null) => ({ source, target, branch });
const workflow = (actionConfig) => ({
 _id: 'exec-r',
 status: 'pending',
 input: {},
 steps: [],
 graph: {
 nodes: [
 node('t', 'trigger'),
 node('a', 'action', { url: 'http://api/a', method: 'POST', ...actionConfig }),
 node('e', 'end'),
 ],
 edges: [edge('t', 'a'), edge('a', 'e')],
 },
});
// replies: what the fake API answers, call by call (the last one repeats)
function makeDeps(replies, extra = {}) {
 const sleeps = [];
 let calls = 0;
 return {sleeps,
 calls: () => calls,
 deps: {
 save: async () => {},
 sleep: async (ms) => { sleeps.push(ms); },
 callApi: async () => {
 const reply = replies[Math.min(calls, replies.length - 1)];
 calls += 1;
 if (reply instanceof Error) throw reply;
 return reply;
 },
 ...extra,
 },
 };
}
describe('engine: retry policy of an Action node', () => {
 test('without a policy there is one call only', async () => {
 const execution = workflow({});
 const t = makeDeps([{ status: 503, body: null }]);
 await runExecution(execution, t.deps);
 expect(execution.status).toBe('failed');
 expect(t.calls()).toBe(1);
 expect(execution.steps[1].attempts).toBe(1);
 });
 test('a transient failure is retried and the run completes', async () => {
 const execution = workflow({ retryAttempts: 2, retryBackoffMs: 100 });
 const t = makeDeps([
 { status: 503, body: null },
 { status: 503, body: null },
 { status: 200, body: { ok: true } },
 ]);
 await runExecution(execution, t.deps);
 expect(execution.status).toBe('completed');
 expect(execution.steps[1].attempts).toBe(3);
 expect(execution.steps[1].output.attempts).toBe(3);
 expect(t.sleeps).toEqual([100, 200]);
 });
 test('when every attempt fails the step fails and keeps the number of attempts', async () => {
 const execution = workflow({ retryAttempts: 2, retryBackoffMs: 100 });
 const t = makeDeps([{ status: 503, body: { error: 'busy' } }]);
 await runExecution(execution, t.deps);
 expect(execution.status).toBe('failed');
 expect(execution.error).toBe('HTTP 503 from http://api/a');
 expect(execution.steps[1].attempts).toBe(3);
 expect(t.calls()).toBe(3);
 });
 test('a network error is retried', async () => {
 const execution = workflow({ retryAttempts: 1, retryBackoffMs: 50 });
 const failure = new Error('Request to http://api/a failed: fetch failed');
 const t = makeDeps([failure, { status: 200, body: {} }]);
 await runExecution(execution, t.deps);
 expect(execution.status).toBe('completed');
 expect(execution.steps[1].attempts).toBe(2);
 });
 test('a 500 is not retried by default but is with server-errors', async () => {
 const plain = workflow({ retryAttempts: 2 });
 const t1 = makeDeps([{ status: 500, body: null }]);
 await runExecution(plain, t1.deps);
 expect(t1.calls()).toBe(1);
 const wide = workflow({ retryAttempts: 2, retryOn: 'server-errors' });
 const t2 = makeDeps([{ status: 500, body: null }, { status: 200, body: {} }]);
 await runExecution(wide, t2.deps);
 expect(wide.status).toBe('completed');
 expect(t2.calls()).toBe(2);
 });
 test('a 404 is never retried', async () => {
 const execution = workflow({ retryAttempts: 3 });
 const t = makeDeps([{ status: 404, body: null }]);
 await runExecution(execution, t.deps);
 expect(t.calls()).toBe(1);
 });
 test('after the retries are used up the saga still rolls back', async () => {
 const execution = {
 _id: 'exec-saga',
 status: 'pending',input: {},
 steps: [],
 graph: {
 nodes: [
 node('t', 'trigger'),
 node('reserve', 'action', {
 url: 'http://api/reserve',
 method: 'POST',
 compensationUrl: 'http://api/release',
 }),
 node('charge', 'action', {
 url: 'http://api/charge',
 method: 'POST',
 retryAttempts: 2,
 retryBackoffMs: 50,
 }),
 node('e', 'end'),
 ],
 edges: [edge('t', 'reserve'), edge('reserve', 'charge'), edge('charge', 'e')],
 },
 };
 const calls = [];
 const deps = {
 save: async () => {},
 sleep: async () => {},
 callApi: async (req) => {
 calls.push(req.url);
 return req.url === 'http://api/charge' ? { status: 503, body: null } : { status: 200, body: {} };
 },
 compensate: async () => ({ ok: true }),
 };
 await runExecution(execution, deps);
 expect(calls.filter((u) => u === 'http://api/charge')).toHaveLength(3);
 expect(execution.status).toBe('compensated');
 });
});
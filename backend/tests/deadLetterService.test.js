const { createDeadLetterService } = require('../src/services/deadLetterService');
// ---------- in-memory stand-ins for the two models ----------
function setup({ workflows = [] } = {}) {
 const letters = [];
 let counter = 0;
 const makeLetter = (data) => ({
 ...data,
 _id: `dl-${(counter += 1)}`,
 status: data.status || 'open',
 note: '',
 replayExecutionId: null,
 save: async function save() { return this; },
 });
 const DeadLetter = {
 findOne: async (q) =>
 letters.find(
 (l) =>
 (q._id === undefined || l._id === q._id) &&
 (q.executionId === undefined || l.executionId === q.executionId) &&
 (q.tenantId === undefined || String(l.tenantId) === String(q.tenantId))
 ) || null,
 create: async (data) => {
 const letter = makeLetter(data);
 letters.push(letter);
 return letter;
 },
 };
 const Workflow = {
 findOne: async (q) =>
 workflows.find((w) => w._id === q._id && String(w.tenantId) === String(q.tenantId)) || null,
 };
 return { service: createDeadLetterService({ DeadLetter, Workflow }), letters };
}
const failedRun = (overrides = {}) => ({
 _id: 'ex-1',
 tenantId: 'T1',
 workflowId: 'w1',
 workflowName: 'Order saga',
 status: 'failed',
 error: 'HTTP 503 from http://x/charge',
 input: { orderId: 'A-1' },
 steps: [
 { nodeId: 'trigger-1', label: 'Start', status: 'completed' },
 {
 nodeId: 'action-3',
 label: 'Charge payment',
 status: 'failed',
 error: 'HTTP 503 from http://x/charge',
 attempts: 3,
 output: { status: 503 },
 },
 ],
 ...overrides,
});
describe('dead-letter queue: recording', () => {
 test('a failed run is recorded with its reason, failed step and input', async () => {
 const { service, letters } = setup();
 const letter = await service.recordIfFailed(failedRun());
 expect(letters).toHaveLength(1);
 expect(letter.status).toBe('open');
 expect(letter.finalStatus).toBe('failed');
 expect(letter.reason).toBe('HTTP 503 from http://x/charge');
 expect(letter.input).toEqual({ orderId: 'A-1' });
 expect(letter.failedStep.label).toBe('Charge payment');
 expect(letter.failedStep.attempts).toBe(3);
 });
 test('rolled back and failed rollbacks are recorded too', async () => {
 const { service, letters } = setup();
 await service.recordIfFailed(failedRun({ _id: 'ex-2', status: 'compensated' }));
 await service.recordIfFailed(failedRun({ _id: 'ex-3', status: 'compensation_failed' }));
 expect(letters.map((l) => l.finalStatus)).toEqual(['compensated', 'compensation_failed']);
 });
 test('a completed run is not recorded', async () => {
 const { service, letters } = setup();
 const result = await service.recordIfFailed(failedRun({ status: 'completed' }));
 expect(result).toBeNull();
 expect(letters).toHaveLength(0);
 });
 test('the same run is recorded only once', async () => {
 const { service, letters } = setup();
 await service.recordIfFailed(failedRun());
 await service.recordIfFailed(failedRun());
 expect(letters).toHaveLength(1);
 });
 test('a run without steps still gets a dead letter', async () => {
 const { service } = setup();
 const letter = await service.recordIfFailed(failedRun({ steps: [], error: null }));
 expect(letter.failedStep).toBeNull();
 expect(letter.reason).toBe('The run ended with an error');
 });
});
describe('dead-letter queue: replay and resolve', () => {
 const workflow = { _id: 'w1', tenantId: 'T1', name: 'Order saga' };
 test('an open dead letter can be replayed', async () => {
 const { service } = setup({ workflows: [workflow] });
 const letter = await service.recordIfFailed(failedRun());
 const prepared = await service.prepareReplay('T1', letter._id);
 expect(prepared.workflow._id).toBe('w1');
 await service.markReplayed(prepared.letter, { _id: 'new-run' });
 expect(letter.status).toBe('replayed');
 expect(letter.replayExecutionId).toBe('new-run');
 });
 test('another tenant cannot replay it', async () => {
 const { service } = setup({ workflows: [workflow] });
 const letter = await service.recordIfFailed(failedRun());
 await expect(service.prepareReplay('T2', letter._id)).rejects.toThrow('Dead letter not found');
 });
 test('it cannot be replayed twice', async () => {
 const { service } = setup({ workflows: [workflow] });
 const letter = await service.recordIfFailed(failedRun());
 const prepared = await service.prepareReplay('T1', letter._id);
 await service.markReplayed(prepared.letter, { _id: 'new-run' });
 await expect(service.prepareReplay('T1', letter._id)).rejects.toThrow('Only open dead letters');
 });
 test('a deleted workflow cannot be replayed', async () => {
 const { service } = setup({ workflows: [] });
 const letter = await service.recordIfFailed(failedRun());
 await expect(service.prepareReplay('T1', letter._id)).rejects.toThrow('does not exist anymore');
 });
 test('a dead letter can be resolved with a note', async () => {
 const { service } = setup();
 const letter = await service.recordIfFailed(failedRun());
 await service.resolve('T1', letter._id, 'Payment gateway was fixed by hand');
 expect(letter.status).toBe('resolved');
 expect(letter.note).toBe('Payment gateway was fixed by hand');
 await expect(service.resolve('T1', letter._id)).rejects.toThrow('already resolved');
 });
 test('errors carry an http status', async () => {
 const { service } = setup();
 let caught;
 try {
 await service.resolve('T1', 'missing');
 } catch (err) {
    caught = err;
 }
 expect(caught.status).toBe(404);
 });
});
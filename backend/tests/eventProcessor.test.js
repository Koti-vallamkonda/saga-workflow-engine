const { createEventProcessor } = require('../src/services/eventProcessor');
// ---------- in-memory stand-ins for the models ----------
function makeEvent(overrides = {}) {
 return {
 _id: 'ev-1',
 tenantId: 'T1',
 type: 'order.created',
 payload: { orderId: 'A-1' },
 status: 'received',
 executionIds: [],
 error: null,
 save: async function save() { return this; },
 ...overrides,
 };
}
function setup({ events = [makeEvent()], workflows = [], startExecution } = {}) {
 const started = [];
 const Event = {
 findOneAndUpdate: async (filter, update) => {
 const found = events.find((e) => e._id === filter._id && e.status === filter.status);
 if (!found) return null;
 Object.assign(found, update);
 return found;
 },
 find: (filter) => ({
 limit: async () => events.filter((e) => e.status === filter.status),
 }),
 };
 let lastQuery = null;
 const Workflow = {
 find: async (query) => {
 lastQuery = query;
 const wanted = query.nodes.$elemMatch['data.eventType'];
 return workflows.filter(
 (w) =>
 String(w.tenantId) === String(query.tenantId) &&
 w.status === query.status &&
 w.nodes.some((n) => n.type === 'trigger' && n.data.eventType === wanted)
 );
 },
 };
 const start = startExecution || (async (args) => {
 started.push(args);
 return { _id: `run-${started.length}` };
 });
 const processor = createEventProcessor({ Event, Workflow, startExecution: start, logger: { log() {} } });
 return { processor, events, started, getQuery: () => lastQuery };
}
const workflow = (id, tenantId, status, eventType) => ({
 _id: id,
 name: `Workflow ${id}`,
 tenantId,
 status,
 nodes: [{ id: 't', type: 'trigger', data: { eventType } }],
 edges: [],
});
describe('event processor', () => {
 test('starts a run for every active workflow that listens for the event', async () => {
 const { processor, events, started } = setup({
 workflows: [
 workflow('w1', 'T1', 'active', 'order.created'),
 workflow('w2', 'T1', 'active', 'order.created'),
 ],
 });
 await processor.processEvent('ev-1');
 expect(started).toHaveLength(2);
 expect(started[0].input).toEqual({ orderId: 'A-1' });
 expect(started[0].trigger.type).toBe('event');
 expect(started[0].trigger.eventType).toBe('order.created');
 expect(events[0].status).toBe('processed');
 expect(events[0].executionIds).toEqual(['run-1', 'run-2']);
 expect(events[0].processedAt).toBeDefined();
 });
 test('ignores draft workflows', async () => {
 const { processor, events, started } = setup({
 workflows: [workflow('w1', 'T1', 'draft', 'order.created')],
 });
 await processor.processEvent('ev-1');
 expect(started).toHaveLength(0);
 expect(events[0].status).toBe('processed');
 });
 test('ignores workflows that listen for another event type', async () => {
 const { processor, started } = setup({ workflows: [workflow('w1', 'T1', 'active', 'invoice.paid')] });
 await processor.processEvent('ev-1');
 expect(started).toHaveLength(0);
 });
 test('never starts workflows of another tenant', async () => {
 const { processor, started, getQuery } = setup({
 workflows: [workflow('w1', 'T2', 'active', 'order.created')],
 });
 await processor.processEvent('ev-1');
 expect(started).toHaveLength(0);
 expect(getQuery().tenantId).toBe('T1');
 });
 test('an event is claimed only once', async () => {
 const { processor, started } = setup({ workflows: [workflow('w1', 'T1', 'active', 'order.created')] });
 const first = await processor.processEvent('ev-1');
 const second = await processor.processEvent('ev-1');
 expect(first).toBeTruthy();
 expect(second).toBeNull();
 expect(started).toHaveLength(1);
 });
 test('a workflow that cannot start is recorded, the others still run', async () => {
 let n = 0;
 const { processor, events } = setup({
 workflows: [
 workflow('w1', 'T1', 'active', 'order.created'),
 workflow('w2', 'T1', 'active', 'order.created'),
 ],
 startExecution: async () => {
 n += 1;
 if (n === 1) throw new Error('Workflow is invalid');
 return { _id: 'run-ok' };
 },
 });
 await processor.processEvent('ev-1');
 expect(events[0].status).toBe('processed');
 expect(events[0].executionIds).toEqual(['run-ok']);
 expect(events[0].error).toContain('Workflow w1: Workflow is invalid');
 });
 test('an event is marked failed when no run could be started', async () => {
 const { processor, events } = setup({
 workflows: [workflow('w1', 'T1', 'active', 'order.created')],
 startExecution: async () => { throw new Error('boom'); },
 });
 await processor.processEvent('ev-1');
 expect(events[0].status).toBe('failed');
 expect(events[0].error).toContain('boom');
 });
 test('recoverPending processes events that were never picked up', async () => {
 const events = [
 makeEvent({ _id: 'ev-1' }),
 makeEvent({ _id: 'ev-2' }),
 makeEvent({ _id: 'ev-3', status: 'processed' }),
 ];
 const { processor, started } = setup({
 events,
 workflows: [workflow('w1', 'T1', 'active', 'order.created')],
 });
 const count = await processor.recoverPending();
 expect(count).toBe(2);
 expect(started).toHaveLength(2);
 expect(events[0].status).toBe('processed');
 expect(events[1].status).toBe('processed');
 });
});
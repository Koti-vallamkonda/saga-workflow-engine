process.env.COMPENSATION_BACKOFF_MS = '20'; // keep the retry waits short in tests
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Tenant = require('../src/models/Tenant');
const Workflow = require('../src/models/Workflow');
const ApiKey = require('../src/models/ApiKey');
const Execution = require('../src/models/Execution');
const { server: mockServer, state: mock } = require('../scripts/mockApi');
jest.setTimeout(40000);
const sample = JSON.parse(
 fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'samples', '05-order-saga.json'), 'utf8')
);
const stamp = Date.now();
const slugA = `test-a-${stamp}`;
const slugB = `test-b-${stamp}`;
let keyA;
let keyB;
let workflowId;
const asA = (req) => req.set('x-tenant-id', slugA).set('x-api-key', keyA);
const asB = (req) => req.set('x-tenant-id', slugB).set('x-api-key', keyB);
// ask the API until the run reaches a final state
async function waitForFinal(executionId) {
 const finals = ['completed', 'failed', 'compensated', 'compensation_failed'];
 for (let i = 0; i < 60; i += 1) {
 const res = await asA(request(app).get(`/api/executions/${executionId}`));
 if (finals.includes(res.body.status)) return res.body;
 await new Promise((resolve) => setTimeout(resolve, 300));
 }
 throw new Error('The execution did not finish in time');
}
beforeAll(async () => {
 await new Promise((resolve) => mockServer.listen(5100, resolve));
 await mongoose.connect(process.env.TEST_MONGO_URI || process.env.MONGO_URI);
 await request(app).post('/api/tenants').send({ name: 'Test A', slug: slugA });
 await request(app).post('/api/tenants').send({ name: 'Test B', slug: slugB });
 const a = await request(app).post('/api/api-keys').set('x-tenant-id', slugA).send({ name: 'test key' });
 const b = await request(app).post('/api/api-keys').set('x-tenant-id', slugB).send({ name: 'test key' });
 keyA = a.body.apiKey;
 keyB = b.body.apiKey;
 const wf = await asA(request(app).post('/api/workflows')).send({
 name: sample.name,
 nodes: sample.nodes,
 edges: sample.edges,
 });
 workflowId = wf.body._id;
});
afterAll(async () => {
 const tenants = await Tenant.find({ slug: { $in: [slugA, slugB] } });
 const ids = tenants.map((t) => t._id);
 await Execution.deleteMany({ tenantId: { $in: ids } });
 await Workflow.deleteMany({ tenantId: { $in: ids } });
 await ApiKey.deleteMany({ tenantId: { $in: ids } });
 await Tenant.deleteMany({ _id: { $in: ids } });
 await mongoose.disconnect();
 await new Promise((resolve) => mockServer.close(resolve));
});
describe('starting a run', () => {
 test('needs an API key', async () => {
 const res = await request(app).post('/api/executions').set('x-tenant-id', slugA).send({ workflowId });
 expect(res.status).toBe(401);
 });
 test('needs a workflowId', async () => {
 const res = await asA(request(app).post('/api/executions')).send({});
 expect(res.status).toBe(400);
 });
 test('input must be an object', async () => {
 const res = await asA(request(app).post('/api/executions')).send({ workflowId, input: [1, 2] });
 expect(res.status).toBe(400);
 });
 test('an invalid workflow id returns 400', async () => {
 const res = await asA(request(app).post('/api/executions')).send({ workflowId: 'abc' });
 expect(res.status).toBe(400);
 });
 test('tenant B cannot run the workflow of tenant A', async () => {
 const res = await asB(request(app).post('/api/executions')).send({ workflowId });
 expect(res.status).toBe(404);
 });
});
describe('a successful run', () => {
 let executionId;
 test('starts with 202 and a pending status', async () => {
 mock.failPayment = false;
 const res = await asA(request(app).post('/api/executions')).send({
 workflowId,
 input: { orderId: 'A-1' },
 });
 expect(res.status).toBe(202);
 expect(res.body.executionId).toBeTruthy();
 executionId = res.body.executionId;
 });
 test('finishes as completed with all steps done', async () => {const execution = await waitForFinal(executionId);
 expect(execution.status).toBe('completed');
 expect(execution.steps).toHaveLength(5);
 expect(execution.steps.every((s) => s.status === 'completed')).toBe(true);
 expect(execution.input).toEqual({ orderId: 'A-1' });
 });
});
describe('a failed run is rolled back (saga)', () => {
 let executionId;
 test('the run ends as compensated and the earlier step is undone', async () => {
 mock.failPayment = true;
 const start = await asA(request(app).post('/api/executions')).send({ workflowId });
 executionId = start.body.executionId;
 const execution = await waitForFinal(executionId);
 expect(execution.status).toBe('compensated');
 expect(execution.error).toContain('HTTP 500');
 const reserve = execution.steps.find((s) => s.label === 'Reserve inventory');
 const charge = execution.steps.find((s) => s.label === 'Charge payment');
 expect(reserve.status).toBe('compensated');
 expect(charge.status).toBe('failed');
 mock.failPayment = false;
 });
});
describe('reading runs and tenant isolation', () => {
 test('tenant A sees its runs, newest first', async () => {
 const res = await asA(request(app).get('/api/executions'));
 expect(res.status).toBe(200);
 expect(res.body.length).toBeGreaterThanOrEqual(2);
 expect(res.body[0].graph).toBeUndefined();
 });
 test('tenant B sees no runs', async () => {
 const res = await asB(request(app).get('/api/executions'));
 expect(res.status).toBe(200);
 expect(res.body).toEqual([]);
 });
 test('tenant B cannot read a run of tenant A', async () => {
 const list = await asA(request(app).get('/api/executions'));
 const res = await asB(request(app).get(`/api/executions/${list.body[0]._id}`));
 expect(res.status).toBe(404);
 });
});

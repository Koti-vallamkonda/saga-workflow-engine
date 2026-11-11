const {
 readRetryPolicy,
 isRetryableStatus,
 isPermanentError,
 callWithPolicy,
} = require('../src/services/retryPolicy');
describe('reading the retry settings of a node', () => {
 test('no settings means no retry', () => {
 expect(readRetryPolicy({})).toEqual({ retries: 0, backoffMs: 500, retryOn: 'transient' });
 expect(readRetryPolicy(undefined)).toEqual({ retries: 0, backoffMs: 500, retryOn: 'transient' });
 });
 test('numbers typed as text are accepted', () => {
 expect(readRetryPolicy({ retryAttempts: '3', retryBackoffMs: '200' })).toEqual({
 retries: 3,
 backoffMs: 200,
 retryOn: 'transient',
 });
 });
 test('values are kept inside safe limits', () => {
 expect(readRetryPolicy({ retryAttempts: 99 }).retries).toBe(5);
 expect(readRetryPolicy({ retryAttempts: -4 }).retries).toBe(0);
 expect(readRetryPolicy({ retryBackoffMs: 1 }).backoffMs).toBe(50);
 expect(readRetryPolicy({ retryBackoffMs: 999999 }).backoffMs).toBe(10000);
 expect(readRetryPolicy({ retryAttempts: 'abc' }).retries).toBe(0);
 });
 test('retryOn only knows transient and server-errors', () => {
 expect(readRetryPolicy({ retryOn: 'server-errors' }).retryOn).toBe('server-errors');
 expect(readRetryPolicy({ retryOn: 'everything' }).retryOn).toBe('transient');
 });
});
describe('which answers are tried again', () => {
 test('transient statuses are retried', () => {
 [408, 425, 429, 502, 503, 504].forEach((s) => expect(isRetryableStatus(s, 'transient')).toBe(true));
 });
 test('normal failures are never retried', () => {
 [400, 401, 403, 404, 422].forEach((s) => {
 expect(isRetryableStatus(s, 'transient')).toBe(false);
 expect(isRetryableStatus(s, 'server-errors')).toBe(false);
 });
 });
 test('500 is only retried with server-errors', () => {
 expect(isRetryableStatus(500, 'transient')).toBe(false);
 expect(isRetryableStatus(500, 'server-errors')).toBe(true);
 expect(isRetryableStatus(501, 'server-errors')).toBe(true);
 });
 test('success is not retried', () => {
 expect(isRetryableStatus(200, 'server-errors')).toBe(false);
 });
 test('wrong settings are permanent errors', () => {
 expect(isPermanentError(new Error('Invalid URL: abc'))).toBe(true);
 expect(isPermanentError(new Error('Calls to private addresses are blocked (localhost)'))).toBe(true);
 expect(isPermanentError(new Error('Only http and https URLs are allowed'))).toBe(true);
 expect(isPermanentError(new Error('Request to http://x failed: fetch failed'))).toBe(false);
 });
});
describe('callWithPolicy', () => {
 const policy = (extra = {}) => ({ retries: 2, backoffMs: 100, retryOn: 'transient', ...extra });
 function setup(replies) {
 const sleeps = [];
 let calls = 0;
 return {
 sleeps,
 calls: () => calls,
 args: (extra) => ({
 request: { url: 'http://x' },
 policy: policy(extra),
 sleep: async (ms) => { sleeps.push(ms); },
 callApi: async () => {
 const reply = replies[Math.min(calls, replies.length - 1)];
 calls += 1;
 if (reply instanceof Error) throw reply;
 return reply;
 },
 }),
 };
 }
 test('one call when it works at once', async () => {
 const t = setup([{ status: 200, body: {} }]);
 const out = await callWithPolicy(t.args());
 expect(out.attempts).toBe(1);
 expect(t.sleeps).toEqual([]);
 });
 test('retries transient answers with growing waits, then succeeds', async () => {
 const t = setup([{ status: 503 }, { status: 503 }, { status: 200, body: 'ok' }]);
 const out = await callWithPolicy(t.args());
 expect(out.res.status).toBe(200);
 expect(out.attempts).toBe(3);
 expect(t.sleeps).toEqual([100, 200]);
 });
 test('gives back the last answer when it keeps failing', async () => {
 const t = setup([{ status: 503 }]);
 const out = await callWithPolicy(t.args());
 expect(out.res.status).toBe(503);
 expect(out.attempts).toBe(3);
 expect(t.calls()).toBe(3);
 });
 test('a network error is retried and the last error is thrown with the number of attempts', async () => {
 const t = setup([new Error('Request to http://x failed: fetch failed')]);
 let caught;
 try {
 await callWithPolicy(t.args());
 } catch (err) {
 caught = err;
 }
 expect(caught.message).toContain('fetch failed');
 expect(caught.attempts).toBe(3);
 expect(t.calls()).toBe(3);
 });
 test('a wrong setting is not retried', async () => {
 const t = setup([new Error('Invalid URL: abc')]);
 let caught;
 try {
 await callWithPolicy(t.args());
 } catch (err) {
 caught = err;
 }
 expect(caught.attempts).toBe(1);
 expect(t.calls()).toBe(1);
 });
 test('retries 0 means exactly one call', async () => {
 const t = setup([{ status: 503 }]);
 const out = await callWithPolicy(t.args({ retries: 0 }));
 expect(out.attempts).toBe(1);
 expect(t.calls()).toBe(1);
 });
 test('a 404 is returned at once', async () => {
 const t = setup([{ status: 404 }]);
 const out = await callWithPolicy(t.args());
 expect(out.attempts).toBe(1);
 });
});
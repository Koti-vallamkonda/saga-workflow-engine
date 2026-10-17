const { withRetry } = require('../services/retry');
describe('withRetry', () => {
 test('returns the result when the first try works', async () => {
 const sleeps = [];
 const sleep = async (ms) => sleeps.push(ms);
 const result = await withRetry(async () => 'ok', { attempts: 3, baseMs: 100, sleep });
 expect(result).toBe('ok');
 expect(sleeps).toEqual([]);
 });
 test('tries again after a failure and waits longer each time', async () => {
 const sleeps = [];
 let calls = 0;
 const result = await withRetry(
 async (attempt) => {
 calls += 1;
 if (attempt < 3) throw new Error('not yet');
 return 'finally';
 },
 { attempts: 3, baseMs: 100, sleep: async (ms) => sleeps.push(ms) }
 );
 expect(result).toBe('finally');
 expect(calls).toBe(3);
 expect(sleeps).toEqual([100, 200]);
 });
 test('gives up after the last attempt and throws the last error', async () => {
 const sleeps = [];
 let calls = 0;
 await expect(
 withRetry(
 async () => {
 calls += 1;
 throw new Error(`fail ${calls}`);
 },
 { attempts: 3, baseMs: 50, sleep: async (ms) => sleeps.push(ms) }
 )
 ).rejects.toThrow('fail 3');
 expect(calls).toBe(3);
 expect(sleeps).toEqual([50, 100]);
 });
 test('passes the attempt number to the task', async () => {
 const seen = [];
 await withRetry(async (attempt) => { seen.push(attempt); if (attempt < 2) throw new Error('x'); }, {
 attempts: 3, baseMs: 1, sleep: async () => {},
 });
 expect(seen).toEqual([1, 2]);
 });
});


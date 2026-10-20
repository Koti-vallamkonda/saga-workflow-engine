const { runExecution } = require('../src/services/executionEngine');

// ---------- helpers ----------
const node = (id, type, config = {}) => ({ id, type, config });
const edge = (source, target, branch = null) => ({ source, target, branch });

function makeExecution(nodes, edges, input = {}) {
  return { _id: 'exec-1', status: 'pending', graph: { nodes, edges }, input, steps: [] };
}

// a fake API: map of url -> { status, body } (or an Error to simulate a network failure)
function makeDeps(responses = {}, extra = {}) {
  const calls = [];
  const sleeps = [];
  let saves = 0;
  const deps = {
    save: async () => { saves += 1; },
    callApi: async (req) => {
      calls.push(req);
      const reply = responses[req.url];
      if (reply instanceof Error) throw reply;
      return reply || { status: 200, body: { ok: true } };
    },
    sleep: async (ms) => { sleeps.push(ms); },
    ...extra,
  };
  return { deps, calls, sleeps, saveCount: () => saves };
}

const linear = () => makeExecution(
  [
    node('t', 'trigger'),
    node('a', 'action', { url: 'http://api/a', method: 'POST', label: 'Step A' }),
    node('e', 'end'),
  ],
  [edge('t', 'a'), edge('a', 'e')],
  { orderId: 'A-1' }
);

describe('execution engine: normal runs', () => {
  test('a linear workflow completes', async () => {
    const execution = linear();
    const { deps, calls } = makeDeps();
    await runExecution(execution, deps);
    expect(execution.status).toBe('completed');
    expect(execution.steps).toHaveLength(3);
    expect(execution.steps.map((s) => s.status)).toEqual(['completed', 'completed', 'completed']);
    expect(execution.startedAt).toBeDefined();
    expect(execution.finishedAt).toBeDefined();
    expect(calls).toHaveLength(1);
  });

  test('a POST action sends the execution id, the input and the previous output', async () => {
    const execution = linear();
    const { deps, calls } = makeDeps();
    await runExecution(execution, deps);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body.executionId).toBe('exec-1');
    expect(calls[0].body.nodeId).toBe('a');
    expect(calls[0].body.input).toEqual({ orderId: 'A-1' });
    expect(calls[0].headers['x-execution-id']).toBe('exec-1');
  });

  test('a GET action sends no body', async () => {
    const execution = makeExecution(
      [node('t', 'trigger'), node('a', 'action', { url: 'http://api/g', method: 'GET' }), node('e', 'end')],
      [edge('t', 'a'), edge('a', 'e')]
    );
    const { deps, calls } = makeDeps();
    await runExecution(execution, deps);
    expect(calls[0].body).toBeUndefined();
  });

  test('every change is saved', async () => {
    const execution = linear();
    const { deps, saveCount } = makeDeps();
    await runExecution(execution, deps);
    expect(saveCount()).toBeGreaterThanOrEqual(8);
  });
});

describe('execution engine: conditions', () => {
  const branching = () => makeExecution(
    [
      node('t', 'trigger'),
      node('a', 'action', { url: 'http://api/a', method: 'GET' }),
      node('c', 'condition', { expression: 'body.total > 100', label: 'Big order?' }),
      node('big', 'end', { label: 'Big' }),
      node('small', 'end', { label: 'Small' }),
    ],
    [edge('t', 'a'), edge('a', 'c'), edge('c', 'big', 'true'), edge('c', 'small', 'false')]
  );

  test('follows the true branch', async () => {
    const execution = branching();
    const { deps } = makeDeps({ 'http://api/a': { status: 200, body: { total: 150 } } });
    await runExecution(execution, deps);
    expect(execution.status).toBe('completed');
    expect(execution.steps.map((s) => s.nodeId)).toEqual(['t', 'a', 'c', 'big']);
  });

  test('follows the false branch', async () => {
    const execution = branching();
    const { deps } = makeDeps({ 'http://api/a': { status: 200, body: { total: 20 } } });
    await runExecution(execution, deps);
    expect(execution.steps.map((s) => s.nodeId)).toEqual(['t', 'a', 'c', 'small']);
  });

  test('a broken expression fails the run', async () => {
    const execution = makeExecution(
      [node('t', 'trigger'), node('c', 'condition', { expression: 'status ===' }), node('e', 'end')],
      [edge('t', 'c'), edge('c', 'e', 'true'), edge('c', 'e', 'false')]
    );
    const { deps } = makeDeps();
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toContain('ended unexpectedly');
  });
});

describe('execution engine: delay', () => {
  const withDelay = (seconds) => makeExecution(
    [node('t', 'trigger'), node('d', 'delay', { seconds }), node('e', 'end')],
    [edge('t', 'd'), edge('d', 'e')]
  );

  test('waits for the given seconds', async () => {
    const execution = withDelay('5');
    const { deps, sleeps } = makeDeps();
    await runExecution(execution, deps);
    expect(sleeps).toEqual([5000]);
    expect(execution.status).toBe('completed');
  });

  test('a very long delay is capped', async () => {
    const execution = withDelay('3600');
    const { deps, sleeps } = makeDeps({}, { maxDelaySeconds: 30 });
    await runExecution(execution, deps);
    expect(sleeps).toEqual([30000]);
  });
});

describe('execution engine: failures', () => {
  test('an HTTP 500 fails the run and keeps the answer', async () => {
    const execution = linear();
    const { deps } = makeDeps({ 'http://api/a': { status: 500, body: { error: 'boom' } } });
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toBe('HTTP 500 from http://api/a');
    const failed = execution.steps.find((s) => s.status === 'failed');
    expect(failed.nodeId).toBe('a');
    expect(failed.output.status).toBe(500);
    expect(execution.steps).toHaveLength(2);
  });

  test('a network error fails the run', async () => {
    const execution = linear();
    const failure = new Error('Request to http://api/a failed: connect refused');
    const { deps } = makeDeps({ 'http://api/a': failure });
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toContain('connect refused');
  });

  test('a workflow without a trigger fails', async () => {
    const execution = makeExecution([node('e', 'end')], []);
    const { deps } = makeDeps();
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toContain('no trigger');
  });

  test('parallel branches are reported as not supported', async () => {
    const execution = makeExecution(
      [node('t', 'trigger'), node('a', 'end'), node('b', 'end')],
      [edge('t', 'a'), edge('t', 'b')]
    );
    const { deps } = makeDeps();
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toContain('more than one outgoing');
  });

  test('a loop is stopped by the step limit', async () => {
    const execution = makeExecution(
      [
        node('t', 'trigger'),
        node('a', 'action', { url: 'http://api/a', method: 'GET' }),
        node('b', 'action', { url: 'http://api/b', method: 'GET' }),
      ],
      [edge('t', 'a'), edge('a', 'b'), edge('b', 'a')]
    );
    const { deps } = makeDeps({}, { maxSteps: 6 });
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(execution.error).toContain('Stopped after 6 steps');
  });

  test('runExecution needs save and callApi', async () => {
    await expect(runExecution(linear(), {})).rejects.toThrow('needs a save function');
  });
});

describe('execution engine: saga hook', () => {
  // reserve (can be undone) -> charge (fails)
  const sagaGraph = () => makeExecution(
    [
      node('t', 'trigger'),
      node('reserve', 'action', {
        url: 'http://api/reserve',
        method: 'POST',
        compensationUrl: 'http://api/release',
      }),
      node('charge', 'action', {
        url: 'http://api/charge',
        method: 'POST',
        compensationUrl: 'http://api/refund',
      }),
      node('e', 'end'),
    ],
    [edge('t', 'reserve'), edge('reserve', 'charge'), edge('charge', 'e')]
  );
  const failingCharge = { 'http://api/charge': { status: 500, body: { error: 'down' } } };

  test('steps with a compensation url get a compensation record', async () => {
    const execution = sagaGraph();
    const { deps } = makeDeps(failingCharge, { compensate: async () => ({ ok: true }) });
    await runExecution(execution, deps);
    const reserve = execution.steps.find((s) => s.nodeId === 'reserve');
    expect(reserve.compensation.url).toBe('http://api/release');
    expect(reserve.compensation.method).toBe('POST');
    expect(reserve.compensation.status).toBe('pending');
  });

  test('a failure triggers compensation and ends as compensated', async () => {
    const execution = sagaGraph();
    let seenStatus = null;
    const { deps } = makeDeps(failingCharge, {
      compensate: async (exec) => { seenStatus = exec.status; return { ok: true }; },
    });
    await runExecution(execution, deps);
    expect(seenStatus).toBe('compensating');
    expect(execution.status).toBe('compensated');
    expect(execution.error).toBe('HTTP 500 from http://api/charge');
  });

  test('a failed compensation ends as compensation_failed', async () => {
    const execution = sagaGraph();
    const { deps } = makeDeps(failingCharge, { compensate: async () => ({ ok: false }) });
    await runExecution(execution, deps);
    expect(execution.status).toBe('compensation_failed');
  });

  test('a crash inside compensation ends as compensation_failed with the reason', async () => {
    const execution = sagaGraph();
    const { deps } = makeDeps(failingCharge, { compensate: async () => { throw new Error('db down'); } });
    await runExecution(execution, deps);
    expect(execution.status).toBe('compensation_failed');
    expect(execution.error).toContain('Compensation error: db down');
  });

  test('without anything to undo the run simply fails', async () => {
    const execution = linear();
    let called = false;
    const { deps } = makeDeps({ 'http://api/a': { status: 500, body: null } }, {
      compensate: async () => { called = true; return { ok: true }; },
    });
    await runExecution(execution, deps);
    expect(execution.status).toBe('failed');
    expect(called).toBe(false);
  });
});
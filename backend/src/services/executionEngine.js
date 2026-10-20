// The execution engine: walks through the graph of a workflow, step by step,
// and keeps the execution state up to date (a state machine).
//
// It does not know about MongoDB or HTTP. Everything it needs is passed in as
// "deps", which makes it easy to test:
//   save(execution)          saves the execution after every change
//   callApi({...})           calls an external API (see httpClient.js)
//   compensate(execution, d) undoes the completed steps (the saga, see sagaCompensator.js)
//   sleep(ms), now()         time helpers

const { transition } = require('./executionStates');
const { evaluateExpression } = require('./expressionEvaluator');

const defaults = {
  maxSteps: Number(process.env.MAX_STEPS) || 100,
  maxDelaySeconds: Number(process.env.MAX_DELAY_SECONDS) || 30,
  stepTimeoutMs: Number(process.env.STEP_TIMEOUT_MS) || 10000,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// keep big API answers small before they are stored
function truncate(value, max = 5000) {
  try {
    const text = JSON.stringify(value);
    if (text === undefined) return value;
    return text.length > max ? `${text.slice(0, max)}...(truncated)` : value;
  } catch {
    return String(value);
  }
}

function newStep(node, now) {
  const config = node.config || {};
  const step = {
    nodeId: node.id,
    type: node.type,
    label: config.label || node.type,
    status: 'running',
    startedAt: now,
    finishedAt: null,
    output: null,
    error: null,
    compensation: null,
  };
  // an Action with a compensation URL can be undone later
  if (node.type === 'action' && config.compensationUrl) {
    step.compensation = {
      url: config.compensationUrl,
      method: String(config.compensationMethod || 'POST').toUpperCase(),
      status: 'pending',
      attempts: 0,
      error: null,
    };
  }
  return step;
}

async function executeNode(node, ctx, execution, d) {
  const config = node.config || {};
  switch (node.type) {
    case 'trigger':
      return { output: { input: ctx.input } };

    case 'action': {
      const method = String(config.method || 'GET').toUpperCase();
      const body =
        method === 'GET'
          ? undefined
          : { executionId: String(execution._id), nodeId: node.id, input: ctx.input, previous: ctx.body };
      const res = await d.callApi({
        url: config.url,
        method,
        body,
        headers: { 'x-execution-id': String(execution._id) },
        timeoutMs: d.stepTimeoutMs,
      });
      ctx.status = res.status;
      ctx.body = res.body;
      const output = { status: res.status, body: truncate(res.body) };
      if (res.status < 200 || res.status >= 300) {
        const err = new Error(`HTTP ${res.status} from ${config.url}`);
        err.output = output;
        throw err;
      }
      return { output };
    }

    case 'condition': {
      const result = evaluateExpression(config.expression, ctx);
      return { output: { expression: config.expression, result }, branch: String(result) };
    }

    case 'delay': {
      const seconds = Math.min(Math.max(Number(config.seconds) || 0, 0), d.maxDelaySeconds);
      await d.sleep(seconds * 1000);
      return { output: { waitedSeconds: seconds } };
    }

    case 'end':
      return { output: {}, done: true };

    default:
      throw new Error(`Unknown node type "${node.type}"`);
  }
}

function pickNext(graph, node, result) {
  if (result.done) return null;
  const name = (node.config && node.config.label) || node.type;
  const outgoing = graph.edges.filter((e) => e.source === node.id);
  let edge;
  if (node.type === 'condition') {
    edge = outgoing.find((e) => e.branch === result.branch);
    if (!edge) throw new Error(`"${name}" has no "${result.branch}" branch`);
  } else {
    if (outgoing.length === 0) throw new Error(`"${name}" has no outgoing connection`);
    if (outgoing.length > 1) {
      throw new Error(
        `"${name}" has more than one outgoing connection. Parallel branches are not supported yet`
      );
    }
    edge = outgoing[0];
  }
  const next = graph.nodes.find((n) => n.id === edge.target);
  if (!next) throw new Error(`A connection points to a node that does not exist (${edge.target})`);
  return next;
}

async function runExecution(execution, deps = {}) {
  const d = { ...defaults, ...deps };
  if (typeof d.save !== 'function' || typeof d.callApi !== 'function') {
    throw new Error('runExecution needs a save function and a callApi function');
  }

  transition(execution, 'running', d.now());
  await d.save(execution);

  const ctx = { input: execution.input || {}, status: null, body: null };
  const graph = execution.graph;
  let failure = null;

  try {
    let current = graph.nodes.find((n) => n.type === 'trigger');
    if (!current) throw new Error('The workflow has no trigger node');
    let count = 0;

    while (current) {
      count += 1;
      if (count > d.maxSteps) throw new Error(`Stopped after ${d.maxSteps} steps (possible loop)`);

      const step = newStep(current, d.now());
      execution.steps.push(step);
      await d.save(execution);

      let result;
      try {
        result = await executeNode(current, ctx, execution, d);
      } catch (err) {
        step.status = 'failed';
        step.error = err.message;
        step.output = err.output || null;
        step.finishedAt = d.now();
        throw err;
      }

      step.status = 'completed';
      step.output = result.output;
      step.finishedAt = d.now();
      await d.save(execution);

      current = pickNext(graph, current, result);
    }
  } catch (err) {
    failure = err;
  }

  if (!failure) {
    transition(execution, 'completed', d.now());
    await d.save(execution);
    return execution;
  }

  // something went wrong: record the reason, then roll back if there is something to undo
  execution.error = failure.message;
  const canUndo = execution.steps.some((s) => s.status === 'completed' && s.compensation);

  if (canUndo && typeof d.compensate === 'function') {
    transition(execution, 'compensating', d.now());
    await d.save(execution);
    let outcome;
    try {
      outcome = await d.compensate(execution, d);
    } catch (err) {
      outcome = { ok: false, error: err.message };
    }
    if (outcome && outcome.error) execution.error += ` | Compensation error: ${outcome.error}`;
    transition(execution, outcome && outcome.ok ? 'compensated' : 'compensation_failed', d.now());
  } else {
    transition(execution, 'failed', d.now());
  }
  await d.save(execution);
  return execution;
}

module.exports = { runExecution };
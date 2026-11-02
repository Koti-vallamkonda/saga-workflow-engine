// All the states an execution can be in, and the changes that are allowed.
const EXECUTION_STATES = [
  'pending',
  'running',
  'completed',
  'failed',
  'compensating',
  'compensated',
  'compensation_failed',
];

// from -> the states it may move to
const TRANSITIONS = {
  pending: ['running'],
  running: ['completed', 'failed', 'compensating'],
  compensating: ['compensated', 'compensation_failed'],
  completed: [],
  failed: [],
  compensated: [],
  compensation_failed: [],
};

// states where the run is over and nothing else will change
const FINAL_STATES = ['completed', 'failed', 'compensated', 'compensation_failed'];

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function isFinal(status) {
  return FINAL_STATES.includes(status);
}

// Change the status of an execution, or throw if the change is not allowed.
function transition(execution, to, now = new Date()) {
  if (!canTransition(execution.status, to)) {
    throw new Error(`Illegal state change: ${execution.status} -> ${to}`);
  }
  execution.status = to;
  if (to === 'running') execution.startedAt = now;
  if (isFinal(to)) execution.finishedAt = now;
  return execution;
}

module.exports = { EXECUTION_STATES, TRANSITIONS, FINAL_STATES, canTransition, isFinal, transition };
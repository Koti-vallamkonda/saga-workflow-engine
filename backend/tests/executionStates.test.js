const { canTransition, isFinal, transition } = require('../src/services/executionStates');

describe('execution state machine', () => {
  test('a run goes pending -> running -> completed', () => {
    const execution = { status: 'pending' };
    transition(execution, 'running');
    expect(execution.status).toBe('running');
    expect(execution.startedAt).toBeDefined();
    transition(execution, 'completed');
    expect(execution.status).toBe('completed');
    expect(execution.finishedAt).toBeDefined();
  });

  test('a failed run with compensation goes running -> compensating -> compensated', () => {
    const execution = { status: 'running' };
    transition(execution, 'compensating');
    transition(execution, 'compensated');
    expect(execution.status).toBe('compensated');
  });

  test('illegal changes are refused', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('completed', 'running')).toBe(false);
    expect(canTransition('failed', 'compensating')).toBe(false);
    expect(() => transition({ status: 'pending' }, 'completed')).toThrow('Illegal state change');
  });

  test('final states are recognised', () => {
    expect(isFinal('completed')).toBe(true);
    expect(isFinal('failed')).toBe(true);
    expect(isFinal('compensated')).toBe(true);
    expect(isFinal('compensation_failed')).toBe(true);
    expect(isFinal('running')).toBe(false);
    expect(isFinal('compensating')).toBe(false);
  });
});
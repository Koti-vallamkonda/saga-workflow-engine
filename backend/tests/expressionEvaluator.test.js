const { evaluateExpression } = require('../src/services/expressionEvaluator');

const ctx = {
  status: 200,
  body: { total: 150, state: 'paid', ok: true, items: [{ name: 'pen' }], missing: null },
  input: { vip: true, orderId: 'A-1' },
};

describe('expression evaluator', () => {
  test('compares numbers', () => {
    expect(evaluateExpression('status === 200', ctx)).toBe(true);
    expect(evaluateExpression('status !== 200', ctx)).toBe(false);
    expect(evaluateExpression('body.total > 100', ctx)).toBe(true);
    expect(evaluateExpression('body.total >= 150', ctx)).toBe(true);
    expect(evaluateExpression('body.total < 100', ctx)).toBe(false);
    expect(evaluateExpression('body.total <= 150', ctx)).toBe(true);
  });

  test('compares text, booleans and null', () => {
    expect(evaluateExpression('body.state === "paid"', ctx)).toBe(true);
    expect(evaluateExpression("body.state == 'refunded'", ctx)).toBe(false);
    expect(evaluateExpression('input.vip === true', ctx)).toBe(true);
    expect(evaluateExpression('body.missing === null', ctx)).toBe(true);
  });

  test('supports && || and !', () => {
    expect(evaluateExpression('body.total > 100 && input.vip === true', ctx)).toBe(true);
    expect(evaluateExpression('body.total > 500 || input.vip', ctx)).toBe(true);
    expect(evaluateExpression('body.total > 500 && input.vip', ctx)).toBe(false);
    expect(evaluateExpression('!body.ok', ctx)).toBe(false);
    expect(evaluateExpression('status >= 500 || !body.ok', ctx)).toBe(false);
  });

  test('a bare path is true when the value is truthy', () => {
    expect(evaluateExpression('body.ok', ctx)).toBe(true);
    expect(evaluateExpression('body.nothing', ctx)).toBe(false);
  });

  test('reads array items by index', () => {
    expect(evaluateExpression('body.items.0.name === "pen"', ctx)).toBe(true);
  });

  test('missing paths are undefined, not an error', () => {
    expect(evaluateExpression('body.a.b.c === 1', ctx)).toBe(false);
  });

  test('text containing operators is not split', () => {
    expect(evaluateExpression('input.orderId === "A-1 && B"', ctx)).toBe(false);
  });

  test('refuses dangerous or invalid input', () => {
    expect(() => evaluateExpression('', ctx)).toThrow('no expression');
    expect(() => evaluateExpression('status ===', ctx)).toThrow('ended unexpectedly');
    expect(() => evaluateExpression('status === 200 )', ctx)).toThrow('Unexpected');
    expect(() => evaluateExpression('process.exit(1)', ctx)).toThrow();
    expect(() => evaluateExpression('status = 1', ctx)).toThrow();
  });

  test('cannot read prototype properties', () => {
    expect(evaluateExpression('body.constructor === null', ctx)).toBe(false);
    expect(evaluateExpression('body.__proto__', ctx)).toBe(false);
  });
});
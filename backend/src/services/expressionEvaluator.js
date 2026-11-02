// A small and SAFE evaluator for the expression of a Condition node.
// It never uses eval or new Function.
//
// Supported:  values: numbers, "text" or 'text', true, false, null, and paths like body.total
//             comparisons: ===  !==  ==  !=  >  >=  <  <=
//             logic: &&  ||  !
// Examples:   status === 200
//             body.total > 100 && input.vip === true
//             status >= 500 || !body.ok

// the pieces of the expression language, one group for each kind of token
const OPERATOR = '(===|!==|==|!=|>=|<=|&&|\\|\\||>|<|!)';
const TEXT = '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')';
const NUMBER = '(-?\\d+(?:\\.\\d+)?)';
const NAME = '([A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z0-9_]+)*)';
const OTHER = '(.)';
const TOKEN = new RegExp(`\\s*(?:${OPERATOR}|${TEXT}|${NUMBER}|${NAME}|${OTHER})`, 'y');

const COMPARE = {
  '===': (a, b) => a === b,
  '!==': (a, b) => a !== b,
  '==': (a, b) => a == b, // eslint-disable-line eqeqeq
  '!=': (a, b) => a != b, // eslint-disable-line eqeqeq
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
};

const BLOCKED_KEYS = ['__proto__', 'constructor', 'prototype'];

function tokenize(text) {
  const tokens = [];
  const re = new RegExp(TOKEN.source, 'y');
  let pos = 0;
  while (pos < text.length) {
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) break;
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'op', v: m[1] });
    else if (m[2] !== undefined) tokens.push({ t: 'str', v: m[2].slice(1, -1).replace(/\\(.)/g, '$1') });
    else if (m[3] !== undefined) tokens.push({ t: 'num', v: Number(m[3]) });
    else if (m[4] !== undefined) tokens.push({ t: 'id', v: m[4] });
    else if (m[5] !== undefined && m[5].trim() !== '') {
      throw new Error(`Unexpected character "${m[5]}" in expression`);
    }
  }
  if (text.slice(pos).trim() !== '') throw new Error('Could not read the expression');
  return tokens;
}

function resolvePath(context, path) {
  let value = context;
  for (const key of path.split('.')) {
    if (BLOCKED_KEYS.includes(key) || value === null || value === undefined) return undefined;
    if (!Object.prototype.hasOwnProperty.call(Object(value), key)) return undefined;
    value = value[key];
  }
  return value;
}

function evaluateExpression(expression, context) {
  if (typeof expression !== 'string' || !expression.trim()) {
    throw new Error('The condition has no expression');
  }
  const tokens = tokenize(expression);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const isOp = (tok, value) => tok && tok.t === 'op' && tok.v === value;

  function operand() {
    const tok = next();
    if (!tok) throw new Error('The expression ended unexpectedly');
    if (tok.t === 'num' || tok.t === 'str') return tok.v;
    if (tok.t === 'id') {
      if (tok.v === 'true') return true;
      if (tok.v === 'false') return false;
      if (tok.v === 'null') return null;
      return resolvePath(context, tok.v);
    }
    throw new Error(`Unexpected "${tok.v}" in the expression`);
  }

  function unary() {
    if (isOp(peek(), '!')) {
      next();
      return !unary();
    }
    return operand();
  }

  function comparison() {
    const left = unary();
    const tok = peek();
    if (tok && tok.t === 'op' && COMPARE[tok.v]) {
      next();
      return COMPARE[tok.v](left, unary());
    }
    return left;
  }

  function and() {
    let value = comparison();
    while (isOp(peek(), '&&')) {
      next();
      const right = comparison();
      value = Boolean(value) && Boolean(right);
    }
    return value;
  }

  function or() {
    let value = and();
    while (isOp(peek(), '||')) {
      next();
      const right = and();
      value = Boolean(value) || Boolean(right);
    }
    return value;
  }

  const result = or();
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i].v}" in the expression`);
  return Boolean(result);
}

module.exports = { evaluateExpression };
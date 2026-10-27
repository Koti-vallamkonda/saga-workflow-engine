import assert from 'node:assert';
import { hasCycle, wouldCreateCycle, validateGraph } from './dagValidator.js';
const n = (id, type = 'action') => ({ id, type, data: { url: 'x', expression: 'y' } });
// 1. graph with a loop
assert.strictEqual(
 hasCycle([n('a'), n('b')], [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }]),
 true
);
// 2. graph without a loop
assert.strictEqual(hasCycle([n('a'), n('b')], [{ source: 'a', target: 'b' }]), false);
// 3. connecting a node to itself is a loop
assert.strictEqual(wouldCreateCycle([n('a')], [], { source: 'a', target: 'a' }), true);
// 4. a graph without a trigger is invalid
assert.strictEqual(validateGraph([n('a')], []).valid, false);
// 5. valid graph: trigger -> action -> end
const good = validateGraph(
    [n('t', 'trigger'), n('a'), n('e', 'end')],
 [{ source: 't', target: 'a' }, { source: 'a', target: 'e' }]
);
assert.strictEqual(good.valid, true);
// 6. condition with only one branch connected is invalid
const bad = validateGraph(
 [n('t', 'trigger'), n('c', 'condition'), n('e', 'end')],
 [
 { source: 't', target: 'c' },
 { source: 'c', target: 'e', sourceHandle: 'true' },
 ]
);
assert.strictEqual(bad.valid, false);
assert.ok(bad.errorNodeIds.includes('c'));
console.log('All tests passed');
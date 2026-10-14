// Cycle (loop) detection using Kahn's algorithm
export function hasCycle(nodes, edges) {
 const inDeg = {};
 const adj = {};
 nodes.forEach((n) => { inDeg[n.id] = 0; adj[n.id] = []; });
 edges.forEach((e) => {
 if (e.source in adj && e.target in inDeg) {
 adj[e.source].push(e.target);
 inDeg[e.target]++;
 }
 });
 const queue = Object.keys(inDeg).filter((id) => inDeg[id] === 0);
 let seen = 0;
 while (queue.length) {
 const u = queue.shift();
 seen++;
 adj[u].forEach((v) => {
 inDeg[v]--;
 if (inDeg[v] === 0) queue.push(v);
 });
 }
 return seen !== nodes.length;
}
// Would adding this new edge create a loop?
export function wouldCreateCycle(nodes, edges, connection) {
 if (connection.source === connection.target) return true;
 return hasCycle(nodes, [...edges, { source: connection.source, target: connection.target }]);
}
export function validateGraph(nodes, edges) {
 const errors = [];
 const errorNodeIds = new Set();
 const add = (msg, id) => {
 errors.push(msg);
 if (id) errorNodeIds.add(id);
 };
 if (nodes.length === 0) add('The canvas is empty');
 const triggers = nodes.filter((n) => n.type === 'trigger');
 if (triggers.length !== 1) add(`Exactly 1 Trigger node is required (currently ${triggers.length})`);
 nodes.forEach((n) => {
 const name = n.data?.label || n.type;
 const incoming = edges.filter((e) => e.target === n.id);
 const outgoing = edges.filter((e) => e.source === n.id);
 if (n.type !== 'trigger' && incoming.length === 0)
 add(`"${name}" has no input connection`, n.id);
 if (n.type !== 'end' && outgoing.length === 0)
 add(`"${name}" has no output connection`, n.id);
 if (n.type === 'condition') {
 const handles = outgoing.map((e) => e.sourceHandle);
 if (!handles.includes('true') || !handles.includes('false')) {
 add(`"${name}": connect both the true and false branches`, n.id);
 }
 if (!n.data?.expression) add(`"${name}": enter an expression`, n.id);
 }
 if (n.type === 'action' && !n.data?.url) add(`"${name}": enter a URL`, n.id);
 });
 if (hasCycle(nodes, edges)) add('The graph contains a loop (cycle)');
 return { valid: errors.length === 0, errors, errorNodeIds: [...errorNodeIds] };
}
// Clean format to send to the backend
export function buildExecutionGraph(nodes, edges) {
 return {
 nodes: nodes.map((n) => ({ id: n.id, type: n.type, config: n.data || {} })),
 edges: edges.map((e) => ({
 source: e.source, target: e.target, branch: e.sourceHandle || null,
 })),
 };
}

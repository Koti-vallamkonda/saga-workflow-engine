function hasCycle(nodes, edges) {
 const inDeg = {};
 const adj = {};
 nodes.forEach((node) => { inDeg[node.id] = 0; adj[node.id] = []; });
 edges.forEach((edge) => {
 if (edge.source in adj && edge.target in inDeg) {
 adj[edge.source].push(edge.target);
 inDeg[edge.target]++;
 }
 });
 const queue = Object.keys(inDeg).filter((id) => inDeg[id] === 0);
 let seen = 0;
 while (queue.length) {
 const current = queue.shift();
 seen++;
 adj[current].forEach((target) => {
 inDeg[target]--;
 if (inDeg[target] === 0) queue.push(target);
 });
 }
 return seen !== nodes.length;
}

function validateGraph(nodes, edges) {
 const errors = [];
 const errorNodeIds = new Set();
 const add = (message, id) => {
 errors.push(message);
 if (id) errorNodeIds.add(id);
 };
 if (nodes.length === 0) add('The canvas is empty');
 const triggers = nodes.filter((node) => node.type === 'trigger');
 if (triggers.length !== 1) add(`Exactly 1 Trigger node is required (currently ${triggers.length})`);
 nodes.forEach((node) => {
 const name = node.data?.label || node.type;
 const incoming = edges.filter((edge) => edge.target === node.id);
 const outgoing = edges.filter((edge) => edge.source === node.id);
 if (node.type !== 'trigger' && incoming.length === 0) add(`"${name}" has no input connection`, node.id);
 if (node.type !== 'end' && outgoing.length === 0) add(`"${name}" has no output connection`, node.id);
 if (node.type === 'condition') {
 const handles = outgoing.map((edge) => edge.sourceHandle);
 if (!handles.includes('true') || !handles.includes('false')) {
 add(`"${name}": connect both the true and false branches`, node.id);
 }
 if (!node.data?.expression) add(`"${name}": enter an expression`, node.id);
 }
 if (node.type === 'action' && !node.data?.url) add(`"${name}": enter a URL`, node.id);
 });
 if (hasCycle(nodes, edges)) add('The graph contains a loop (cycle)');
 return { valid: errors.length === 0, errors, errorNodeIds: [...errorNodeIds] };
}

function buildExecutionGraph(nodes, edges) {
 return {
 nodes: nodes.map((node) => ({ id: node.id, type: node.type, config: node.data || {} })),
 edges: edges.map((edge) => ({
 source: edge.source, target: edge.target, branch: edge.sourceHandle || null,
 })),
 };
}

module.exports = { hasCycle, validateGraph, buildExecutionGraph };
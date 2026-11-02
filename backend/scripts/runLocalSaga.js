// Runs a workflow file through the engine and the saga WITHOUT a database.
// Handy to try the saga quickly:
// 1) npm run mock-api (in one terminal)
// 2) npm run saga-demo (in another terminal)
// 3) optional: node scripts/runLocalSaga.js ../docs/samples/05-order-saga.json
const fs = require('fs');
const path = require('path');
const { validateGraph, buildExecutionGraph } = require('../../frontend/src/utils/dagValidator');
const { runExecution } = require('../src/services/executionEngine');
const { compensate } = require('../src/services/sagaCompensator');
const { callApi } = require('../src/services/httpClient');
const file = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'samples', '05-order-saga.json');
const sample = JSON.parse(fs.readFileSync(file, 'utf8'));
const check = validateGraph(sample.nodes, sample.edges);
if (!check.valid) {
 console.log('The workflow is not valid:');
 check.errors.forEach((e) => console.log(' -', e));
 process.exit(1);
}
const execution = {
 _id: 'local-run',
 status: 'pending',
 graph: buildExecutionGraph(sample.nodes, sample.edges),
 input: { orderId: 'A-1001', amount: 499 },
 steps: [],
};
(async () => {
 console.log(`Running "${sample.name}"...\n`);
 await runExecution(execution, { save: async () => {}, callApi, compensate });
 execution.steps.forEach((s) => {
 const undo =
 s.compensation && s.compensation.status !== 'pending'
 ? ` undo: ${s.compensation.status} (attempts: ${s.compensation.attempts})`
 : '';
 console.log(` ${s.label.padEnd(26)} ${s.status}${undo}`);
 });
 console.log(`\nFinal status: ${execution.status}`);
 if (execution.error) console.log(`Reason: ${execution.error}`);
})();

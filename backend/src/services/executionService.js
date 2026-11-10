// Starts a workflow run: creates the Execution record, then runs it in the background.
const Execution = require('../models/Execution');
const { validateGraph, buildExecutionGraph } = require('../utils/dagValidator');
const { runExecution } = require('./executionEngine');
const { compensate } = require('./sagaCompensator');
const { callApi } = require('./httpClient');
// the steps array is a plain array, so Mongoose must be told that it changed
async function saveExecution(execution) {
 execution.markModified('steps');
 await execution.save();
}
async function startExecution({ tenantId, workflow, input = {}, trigger = { type: 'manual' } }) {
 const check = validateGraph(workflow.nodes, workflow.edges);
 if (!check.valid) {
 const error = new Error(`Workflow is invalid: ${check.errors.join('; ')}`);
 error.status = 400;
 throw error;
 }
 const execution = await Execution.create({
 tenantId,
 workflowId: workflow._id,
 workflowName: workflow.name,
 trigger,
 input,
 graph: buildExecutionGraph(workflow.nodes, workflow.edges),
 status: 'pending',
 steps: [],
 });
 // run in the background so the caller gets an answer right away
 setImmediate(() => {
 runExecution(execution, { save: saveExecution, callApi, compensate }).catch(async (err) => {
 console.error(`Execution ${execution._id} crashed:`, err.message);
 try {
 // last resort: never leave a run stuck as pending or running
 await Execution.updateOne(
 { _id: execution._id, status: { $in: ['pending', 'running'] } },
 { status: 'failed', error: `Engine error: ${err.message}`, finishedAt: new Date() }
 );
 } catch (updateErr) {
 console.error('Could not mark the execution as failed:', updateErr.message);
 }
 });
 });
 return execution;
}
module.exports = { startExecution };
const express = require('express');
const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const { startExecution } = require('../services/executionService');
const router = express.Router();
// start a run of a workflow
router.post('/', async (req, res, next) => {
 try {
 const { workflowId, input } = req.body;
 if (!workflowId) {
 return res.status(400).json({ message: 'workflowId is required' });
 }
 if (input !== undefined && (typeof input !== 'object' || input === null || Array.isArray(input))) {
 return res.status(400).json({ message: 'input must be a JSON object' });
 }
 const workflow = await Workflow.findOne({ _id: workflowId, tenantId: req.tenant._id });
 if (!workflow) {
 return res.status(404).json({ message: 'Workflow not found' });
 }
 const execution = await startExecution({
 tenantId: req.tenant._id,
 workflow,
 input: input || {},
 trigger: { type: 'manual' },
 });
 res.status(202).json({ executionId: execution._id, status: execution.status });
 } catch (err) {
 next(err);
 }
});
// the latest runs of this tenant (optionally only one workflow)
router.get('/', async (req, res, next) => {
 try {
 const filter = { tenantId: req.tenant._id };
 if (typeof req.query.workflowId === 'string' && req.query.workflowId) {
 filter.workflowId = req.query.workflowId;
 }
 const executions = await Execution.find(filter).sort({ createdAt: -1 }).limit(50).select('-graph');
 res.json(executions);
 } catch (err) {
 next(err);
 }
});
// one run with all its steps
router.get('/:id', async (req, res, next) => {
 try {
 const execution = await Execution.findOne({ _id: req.params.id, tenantId: req.tenant._id });
 if (!execution) {
 return res.status(404).json({ message: 'Execution not found' });
 }
 res.json(execution);
 } catch (err) {
 next(err);
 }
});
module.exports = router;
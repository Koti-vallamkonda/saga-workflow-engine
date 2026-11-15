const express = require('express');
const DeadLetter = require('../models/DeadLetter');
const { startExecution } = require('../services/executionService');
const { defaultService } = require('../services/deadLetterService');
const router = express.Router();
const STATUSES = ['open', 'replayed', 'resolved'];
// the latest dead letters of this tenant (optional ?status=open)
router.get('/', async (req, res, next) => {
 try {
 const filter = { tenantId: req.tenant._id };
 if (typeof req.query.status === 'string' && STATUSES.includes(req.query.status)) {
 filter.status = req.query.status;
 }
 const letters = await DeadLetter.find(filter).sort({ createdAt: -1 }).limit(50);
 res.json(letters);
 } catch (err) {
 next(err);
 }
});
// one dead letter
router.get('/:id', async (req, res, next) => {
 try {
 const letter = await DeadLetter.findOne({ _id: req.params.id, tenantId: req.tenant._id });
 if (!letter) return res.status(404).json({ message: 'Dead letter not found' });
 res.json(letter);
 } catch (err) {
 next(err);
 }
});
// start the run again with the same input
router.post('/:id/replay', async (req, res, next) => {
 try {
 const service = defaultService();
 const { letter, workflow } = await service.prepareReplay(req.tenant._id, req.params.id);
 const execution = await startExecution({
 tenantId: req.tenant._id,
 workflow,
 input: letter.input || {},
 trigger: { type: 'replay', deadLetterId: letter._id },
 });
 await service.markReplayed(letter, execution);
 res.status(202).json({ deadLetterId: letter._id, executionId: execution._id, status: execution.status });
 } catch (err) {
 next(err);
 }
});
// close it without replaying (for example after fixing the problem by hand)
router.post('/:id/resolve', async (req, res, next) => {
 try {
 const letter = await defaultService().resolve(req.tenant._id, req.params.id, req.body && req.body.note);
 res.json(letter);
 } catch (err) {
 next(err);
 }
});
module.exports = router;

const express = require('express');
const Event = require('../models/Event');
const router = express.Router();
// send an event. Saving it is what triggers the workflows (through the change stream).
router.post('/', async (req, res, next) => {
 try {
 const { type, payload } = req.body;
 if (typeof type !== 'string' || !type.trim()) {
 return res.status(400).json({ message: 'type is required' });
 }
 const badPayload = typeof payload !== 'object' || payload === null || Array.isArray(payload);
 if (payload !== undefined && badPayload) {
 return res.status(400).json({ message: 'payload must be a JSON object' });
 }
 const event = await Event.create({
 tenantId: req.tenant._id,
 type: type.trim(),
 payload: payload || {},
 });
 res.status(201).json({ id: event._id, type: event.type, status: event.status });
 } catch (err) {
 next(err);
 }
});
// the latest events of this tenant
router.get('/', async (req, res, next) => {
 try {
 const events = await Event.find({ tenantId: req.tenant._id }).sort({ createdAt: -1 }).limit(50);
 res.json(events);
 } catch (err) {
 next(err);
 }
});
// one event, with the runs it started
router.get('/:id', async (req, res, next) => {
 try {
 const event = await Event.findOne({ _id: req.params.id, tenantId: req.tenant._id });
 if (!event) {
 return res.status(404).json({ message: 'Event not found' });
 }
 res.json(event);
 } catch (err) {
 next(err);
 }
});
module.exports = router;
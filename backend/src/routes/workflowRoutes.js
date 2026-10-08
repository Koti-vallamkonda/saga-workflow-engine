const express = require('express');
const Workflow = require('../models/Workflow');

const router = express.Router();

// workflow banao (us tenant ke naam pe)
router.post('/', async (req, res, next) => {
  try {
    const { name, nodes, edges } = req.body;
    const workflow = await Workflow.create({
      tenantId: req.tenant._id,
      name,
      nodes,
      edges,
    });
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
});

// sirf apne tenant ke workflows dekho
router.get('/', async (req, res, next) => {
  try {
    const workflows = await Workflow.find({ tenantId: req.tenant._id });
    res.json(workflows);
  } catch (err) {
    next(err);
  }
});

// ek workflow dekho
router.get('/:id', async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id,
    });
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
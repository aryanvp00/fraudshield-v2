const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { blockDemo } = require('../middleware/auth');

const escapeRegex = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const badId = id => !mongoose.isValidObjectId(id);

// GET /api/transactions?verdict=FRAUD&limit=50&page=1&search=
router.get('/', async (req, res) => {
  try {
    const { verdict, search } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const query = { userId: req.user.id };
    if (['FRAUD', 'SUSPICIOUS', 'SAFE'].includes(verdict)) query.verdict = verdict;
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [{ senderUPI: rx }, { receiverUPI: rx }, { type: rx }, { upiApp: rx }];
    }
    const total = await Transaction.countDocuments(query);
    const txns = await Transaction.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.json({ total, page, transactions: txns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id  (someone else's id -> 404)
router.get('/:id', async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const txn = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!txn) return res.status(404).json({ error: 'Not found' });
    res.json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/transactions/:id/review
router.patch('/:id/review', blockDemo, async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const txn = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isReviewed: true, reviewedBy: req.user.name },
      { new: true }
    );
    if (!txn) return res.status(404).json({ error: 'Not found' });
    res.json(txn);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', blockDemo, async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const r = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

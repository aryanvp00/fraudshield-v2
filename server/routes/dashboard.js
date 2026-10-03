const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Transaction = require('../models/Transaction');

const IST = 'Asia/Kolkata';
const DAY = 24 * 60 * 60 * 1000;
const istDay = ms => new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

// GET /api/dashboard/stats  (only the logged-in user's transactions)
router.get('/stats', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const mine = { userId };

    const [counts] = await Transaction.aggregate([
      { $match: mine },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        fraud: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } },
        suspicious: { $sum: { $cond: [{ $eq: ['$verdict', 'SUSPICIOUS'] }, 1, 0] } },
        safe: { $sum: { $cond: [{ $eq: ['$verdict', 'SAFE'] }, 1, 0] } },
        fraudAmountSum: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, '$amount', 0] } },
      } },
    ]);
    const { total = 0, fraud = 0, suspicious = 0, safe = 0, fraudAmountSum = 0 } = counts || {};
    const avgFraudAmount = fraud ? Math.round(fraudAmountSum / fraud) : 0;

    const byApp = await Transaction.aggregate([
      { $match: mine },
      { $group: { _id: '$upiApp', total: { $sum: 1 }, fraud: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } } } },
      { $project: { _id: 0, app: '$_id', total: 1, fraud: 1, fraudRate: { $multiply: [{ $divide: ['$fraud', '$total'] }, 100] } } },
      { $sort: { total: -1 } },
    ]);

    // last 7 IST days, zero-filled so charts are never empty
    const since = new Date(Date.now() - 7 * DAY);
    const rows = await Transaction.aggregate([
      { $match: { ...mine, createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: IST } },
        fraud: { $sum: { $cond: [{ $eq: ['$verdict', 'FRAUD'] }, 1, 0] } },
        suspicious: { $sum: { $cond: [{ $eq: ['$verdict', 'SUSPICIOUS'] }, 1, 0] } },
        safe: { $sum: { $cond: [{ $eq: ['$verdict', 'SAFE'] }, 1, 0] } },
      } },
    ]);
    const byDay = Object.fromEntries(rows.map(r => [r._id, r]));
    const trend = Array.from({ length: 7 }, (_, i) => {
      const d = istDay(Date.now() - (6 - i) * DAY);
      const r = byDay[d];
      return { _id: d, fraud: r?.fraud || 0, suspicious: r?.suspicious || 0, safe: r?.safe || 0 };
    });

    const alerts = await Transaction.find({ ...mine, verdict: { $in: ['FRAUD', 'SUSPICIOUS'] } })
      .sort({ createdAt: -1 }).limit(5)
      .select('type amount upiApp fraudProbability verdict createdAt reasons');

    res.json({ total, fraud, suspicious, safe, avgFraudAmount, byApp, trend, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

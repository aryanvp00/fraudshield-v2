const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const Transaction = require('../models/Transaction');
const { blockDemo } = require('../middleware/auth');

const TYPES = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'DEBIT', 'CASH_IN'];
const num = v => (v === undefined || v === null || v === '' ? 0 : Number(v));

const ML_SCRIPT = path.join(__dirname, '../../ml/predict.py');
const PYTHON = process.env.PYTHON_PATH || 'python3';

// ── Run Python prediction ─────────────────────────────────────────────────────
function runPrediction(inputData) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, [ML_SCRIPT, JSON.stringify(inputData)]);
    let output = '';
    let errOutput = '';

    py.stdout.on('data', d => output += d.toString());
    py.stderr.on('data', d => errOutput += d.toString());

    py.on('close', code => {
      if (code !== 0) return reject(new Error(`Python error: ${errOutput}`));
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        reject(new Error(`JSON parse error: ${output}`));
      }
    });
  });
}

// POST /api/predict
// Body: { type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest, step, upiApp, senderUPI, receiverUPI, note }
router.post('/', blockDemo, async (req, res) => {
  try {
    const { type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest, step, upiApp, senderUPI, receiverUPI, note } = req.body;

    // Validate required fields
    if (!TYPES.includes(type) || [amount, oldbalanceOrg, newbalanceOrig].some(v => v === undefined || v === null || v === '')) {
      return res.status(400).json({ error: 'Missing or invalid fields: type, amount, oldbalanceOrg, newbalanceOrig' });
    }
    if ([amount, oldbalanceOrg, newbalanceOrig, num(oldbalanceDest), num(newbalanceDest)].some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) {
      return res.status(400).json({ error: 'Amounts must be non-negative numbers' });
    }

    // Call Python
    const mlResult = await runPrediction({ type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest: oldbalanceDest || 0, newbalanceDest: newbalanceDest || 0, step: step || 1 });

    // Save to MongoDB
    const txn = new Transaction({
      userId: req.user.id, // from the JWT, never from the request body
      type, amount,
      oldbalanceOrg, newbalanceOrig,
      oldbalanceDest: oldbalanceDest || 0,
      newbalanceDest: newbalanceDest || 0,
      step: step || 1,
      upiApp: String(upiApp || 'Unknown').slice(0, 40),
      senderUPI: String(senderUPI || '').slice(0, 80),
      receiverUPI: String(receiverUPI || '').slice(0, 80),
      note: String(note || '').slice(0, 200),
      fraudProbability: mlResult.fraud_probability,
      verdict: mlResult.verdict,
      confidence: mlResult.confidence,
      anomalyScore: mlResult.anomaly_score,
      reasons: mlResult.reasons
    });

    await txn.save();

    res.json({ success: true, transactionId: txn._id, ...mlResult });
  } catch (err) {
    console.error('Prediction error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

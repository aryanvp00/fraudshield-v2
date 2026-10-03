const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { guard, getSecret } = require('../middleware/auth');
const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEMO_EMAIL = 'demo@fraudshield.app';

const sign = u => jwt.sign(
  { id: String(u._id), name: u.name, email: u.email, role: u.role === 'viewer' ? 'user' : u.role },
  getSecret(),
  { expiresIn: '7d' }
);
const out = u => ({
  token: sign(u),
  user: { name: u.name, email: u.email, role: u.role === 'viewer' ? 'user' : u.role },
});

function validateRegistration({ name, email, password, confirmPassword }) {
  const errors = {};
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) errors.name = 'Name must be 2-50 characters';
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) errors.email = 'Enter a valid email address';
  if (typeof password !== 'string' || password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) errors.password = 'Password needs an uppercase letter, a lowercase letter and a number';
  else if (password.length > 72) errors.password = 'Password is too long (max 72)';
  if (confirmPassword !== undefined && password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

// POST /api/auth/register  (always creates a normal "user")
router.post('/register', async (req, res) => {
  try {
    const errors = validateRegistration(req.body || {});
    if (Object.keys(errors).length) return res.status(400).json({ error: Object.values(errors)[0], fields: errors });
    const email = req.body.email.trim().toLowerCase();
    if (email === DEMO_EMAIL) return res.status(409).json({ error: 'Email already registered', fields: { email: 'Email already registered' } });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered', fields: { email: 'Email already registered' } });
    const u = await User.create({
      name: req.body.name.trim(), email,
      passwordHash: await bcrypt.hash(req.body.password, 10), role: 'user',
    });
    res.status(201).json(out(u));
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Email already registered', fields: { email: 'Email already registered' } });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password required' });
    const u = await User.findOne({ email: email.trim().toLowerCase() });
    // same message for unknown email and wrong password
    if (!u || u.role === 'demo' || !(await bcrypt.compare(password, u.passwordHash)))
      return res.status(401).json({ error: 'Wrong email or password' });
    res.json(out(u));
  } catch (e) { res.status(500).json({ error: 'Login failed' }); }
});

// Sample data so the read-only demo has something to show.
const DAY = 24 * 60 * 60 * 1000;
const SEED = [
  ['TRANSFER', 450000, 452000, 0, 0, 450000, 'PhonePe', 'FRAUD', 97.4, 'HIGH', 0],
  ['CASH_OUT', 95000, 96000, 0, 1000, 96000, 'Paytm', 'SUSPICIOUS', 58.2, 'MEDIUM', 1],
  ['PAYMENT', 450, 12000, 11550, 0, 0, 'Google Pay', 'SAFE', 1.1, 'HIGH', 1],
  ['PAYMENT', 1200, 30000, 28800, 0, 0, 'PhonePe', 'SAFE', 0.8, 'HIGH', 2],
  ['TRANSFER', 25000, 80000, 55000, 10000, 35000, 'Google Pay', 'SAFE', 6.3, 'HIGH', 2],
  ['CASH_OUT', 210000, 210000, 0, 5000, 215000, 'Paytm', 'FRAUD', 91.7, 'HIGH', 3],
  ['PAYMENT', 799, 5400, 4601, 0, 0, 'BHIM', 'SAFE', 0.5, 'HIGH', 4],
  ['CASH_IN', 15000, 20000, 35000, 0, 0, 'Google Pay', 'SAFE', 2.0, 'HIGH', 4],
  ['TRANSFER', 62000, 64000, 2000, 0, 62000, 'PhonePe', 'SUSPICIOUS', 46.9, 'MEDIUM', 5],
  ['PAYMENT', 320, 9000, 8680, 0, 0, 'Paytm', 'SAFE', 0.4, 'HIGH', 6],
];
async function seedDemo(userId) {
  if (await Transaction.countDocuments({ userId })) return;
  const now = Date.now();
  await Transaction.insertMany(SEED.map(([type, amount, ob, nb, od, nd, app, verdict, p, conf, d], i) => ({
    userId, type, amount, oldbalanceOrg: ob, newbalanceOrig: nb, oldbalanceDest: od, newbalanceDest: nd,
    upiApp: app, senderUPI: 'demo@upi', receiverUPI: `merchant${i}@upi`,
    fraudProbability: p, verdict, confidence: conf, anomalyScore: p / 100,
    reasons: verdict === 'SAFE' ? [] : [{ factor: type === 'TRANSFER' ? 'Account emptied' : 'Large cash-out', contribution: 40 }],
    createdAt: new Date(now - d * DAY - i * 3600 * 1000),
  })));
}

// POST /api/auth/demo  (read-only demo user, own sample data)
router.post('/demo', async (req, res) => {
  try {
    let u = await User.findOne({ email: DEMO_EMAIL });
    if (!u) u = await User.create({
      name: 'Demo User', email: DEMO_EMAIL, role: 'demo',
      passwordHash: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
    });
    else if (u.role !== 'demo') { u.role = 'demo'; await u.save(); }
    await seedDemo(u._id);
    res.json(out(u));
  } catch (e) { res.status(500).json({ error: 'Demo login failed' }); }
});

// GET /api/auth/me
router.get('/me', guard(), (req, res) => res.json({ user: req.user }));

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { guard, getSecret } = require('./middleware/auth');

getSecret(); // fails fast in production if JWT_SECRET is missing

const app = express();
app.set('trust proxy', 1); // Render/Vercel proxies

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(helmet());
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim().replace(/\/$/, ''));
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '100kb' }));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── MONGODB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraudshield')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/transactions', guard(), require('./routes/transactions'));
app.use('/api/predict',      guard(), require('./routes/predict'));
app.use('/api/model',        guard(), require('./routes/model')); // /train is admin-only inside
app.use('/api/dashboard',    guard(), require('./routes/dashboard'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

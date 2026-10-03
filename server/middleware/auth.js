const jwt = require('jsonwebtoken');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s !== 'change_me') return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is missing or still "change_me". Set a long random value in production.');
  }
  return 'dev-secret-change-me';
}

// guard()        -> any logged-in user
// guard('admin') -> admin only
function guard(role) {
  return (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Login required' });
    try {
      req.user = jwt.verify(token, getSecret());
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (role && req.user.role !== role) {
      return res.status(403).json({ error: 'Admin only' });
    }
    next();
  };
}

// Demo account can read, never write.
function blockDemo(req, res, next) {
  if (req.user && req.user.role === 'demo') {
    return res.status(403).json({ error: 'Demo account is read-only. Register to analyze your own transactions.' });
  }
  next();
}

module.exports = { guard, blockDemo, getSecret };

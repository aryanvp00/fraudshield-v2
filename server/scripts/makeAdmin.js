require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) { console.log('Usage: node scripts/makeAdmin.js you@email.com'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraudshield');
  const u = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  console.log(u ? `✅ ${u.email} is now admin` : '❌ No user with that email. Register first.');
  process.exit(0);
})();

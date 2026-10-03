// One-time cleanup for transactions saved BEFORE per-user isolation (no userId).
//   node scripts/migrateOrphans.js                       -> dry run, only counts
//   node scripts/migrateOrphans.js --delete              -> delete orphans
//   node scripts/migrateOrphans.js --assign you@mail.com -> give orphans to that user
// Also converts old role "viewer" -> "user".
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fraudshield');
  const args = process.argv.slice(2);
  const orphanQ = { $or: [{ userId: { $exists: false } }, { userId: null }] };
  const n = await Transaction.collection.countDocuments(orphanQ);
  console.log(`Orphan transactions: ${n}`);

  if (args[0] === '--delete') {
    const r = await Transaction.collection.deleteMany(orphanQ);
    console.log(`🗑  Deleted ${r.deletedCount}`);
  } else if (args[0] === '--assign') {
    const u = await User.findOne({ email: (args[1] || '').toLowerCase() });
    if (!u) { console.log('❌ No user with that email. Register first.'); process.exit(1); }
    const r = await Transaction.collection.updateMany(orphanQ, { $set: { userId: u._id } });
    console.log(`✅ Assigned ${r.modifiedCount} to ${u.email}`);
  } else {
    console.log('Dry run. Re-run with --delete or --assign you@email.com');
  }
  const r2 = await User.updateMany({ role: 'viewer' }, { role: 'user' });
  console.log(`Roles converted viewer→user: ${r2.modifiedCount}`);
  process.exit(0);
})();

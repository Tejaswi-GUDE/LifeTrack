// CLI seed script. Run with: npm run seed
// Requires MONGODB_URI in .env (Atlas connection string or local mongod).
// Wipes and reloads every collection so the demo can always be reset to a
// known state. The seeding logic lives in runSeed.js so it can also run
// in-process (see src/devServer.js).

require('dotenv').config();
const { connectDB } = require('../db');
const { runSeed } = require('./runSeed');

(async () => {
  const conn = await connectDB();
  try {
    await runSeed();
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('[seed] failed:', err);
    process.exit(1);
  }
})();

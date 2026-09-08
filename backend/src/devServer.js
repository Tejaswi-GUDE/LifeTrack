// Zero-setup local dev entry point.
//
// Spins up an in-memory MongoDB (mongodb-memory-server), runs the real seed
// script against it, then starts the Express API. Nothing is installed on the
// machine and no data persists between runs — every start is a clean, fully
// seeded database. For a persistent / Atlas database use `npm start`.
require('dotenv').config();

const PORT = process.env.PORT || 4000;

async function main() {
  // mongodb-memory-server ships both CJS and ESM builds.
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch (e) {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'));
  }

  console.log('[dev] starting in-memory MongoDB…');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('lifetrack');
  process.env.MONGODB_URI = uri;
  console.log(`[dev] in-memory MongoDB ready: ${uri}`);

  const { connectDB } = require('./db');
  await connectDB();

  console.log('[dev] seeding demo data…');
  const { runSeed } = require('./seed/runSeed');
  await runSeed();

  const app = require('./app');
  const server = app.listen(PORT, () => {
    console.log(`[dev] API listening on http://localhost:${PORT}`);
    console.log(`[dev] try: http://localhost:${PORT}/api/dashboards/government`);
  });

  const shutdown = async () => {
    console.log('\n[dev] shutting down…');
    server.close();
    try {
      await mongod.stop();
    } catch (e) {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev] failed to start:', err);
  process.exit(1);
});

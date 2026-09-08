// Production / real-database entry point. Connects to MONGODB_URI (Atlas or a
// local mongod) and serves the API. For a zero-setup local run that also
// seeds demo data, use `npm run dev` (src/devServer.js) instead.
require('dotenv').config();

const { connectDB } = require('./db');
const app = require('./app');

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[api] startup failed:', err.message);
    process.exit(1);
  });

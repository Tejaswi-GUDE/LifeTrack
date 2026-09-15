// Vercel serverless entry point.
//
// Vercel auto-builds any file under /api as its own function, so this file
// (backend/api/index.js) becomes the single function that handles every
// request (see ../vercel.json rewrites). It reuses the same Express `app`
// used for local dev — no route logic lives here.
//
// The Mongo connection is cached on the module scope so warm invocations
// reuse it instead of reconnecting on every request (cold starts still pay
// the connect cost once).
const { connectDB } = require('../src/db');
const app = require('../src/app');

let connectPromise;

module.exports = async (req, res) => {
  if (!connectPromise) {
    connectPromise = connectDB().catch((err) => {
      // Allow the next invocation to retry instead of caching a rejection.
      connectPromise = undefined;
      throw err;
    });
  }
  try {
    await connectPromise;
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database connection failed', message: err.message }));
    return;
  }
  return app(req, res);
};

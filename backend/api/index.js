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
  // Temporary diagnostic route — bypasses the DB entirely so we can tell
  // whether MONGODB_URI even reached the function, before blaming Mongo.
  // Safe to remove once the real connection issue is found: it only ever
  // prints whether the var exists and its length, never the value itself.
  if (req.url === '/api/diag') {
    const uri = process.env.MONGODB_URI;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      mongodbUriPresent: Boolean(uri),
      mongodbUriLength: uri ? uri.length : 0,
      mongodbUriHost: uri ? uri.replace(/\/\/.*@/, '//<redacted>@').split('@')[1]?.split('/')[0] : null,
      nodeVersion: process.version,
    }));
    return;
  }
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
    console.error('[api] DB connect failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database connection failed', message: err.message, name: err.name }));
    return;
  }
  return app(req, res);
};

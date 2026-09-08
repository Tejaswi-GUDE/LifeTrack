// Central error handling — every route wraps its async body in try/catch and
// calls next(err); this turns that into a clean JSON response.

function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[api] error:', err);
  res.status(status).json({ error: err.message || 'Internal error' });
}

module.exports = { notFound, errorHandler };

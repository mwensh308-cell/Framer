'use strict';

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, _next) {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  const message = status >= 500 ? 'Something went wrong. Please try again.' : err.message;
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: message, ...(err.details ? { details: err.details } : {}) });
  }
  res.status(status).type('html').send(
    require('../views/pages/error').render({ status, message, req })
  );
}

module.exports = { HttpError, asyncHandler, apiNotFound, errorHandler };

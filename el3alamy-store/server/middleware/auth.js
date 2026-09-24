'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { get } = require('../db');
const { HttpError } = require('./errors');

const COOKIE = 'el3_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: MAX_AGE_MS, path: '/',
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = get().prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(payload.sub);
      if (user) req.user = user;
    } catch { /* expired or tampered — treat as signed out */ }
  }
  next();
}

const requireAuth = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Please sign in.')));
const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new HttpError(req.user ? 403 : 401, 'Admin access required.'));

module.exports = { issueSession, clearSession, loadUser, requireAuth, requireAdmin };

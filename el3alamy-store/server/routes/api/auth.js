'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { get } = require('../../db');
const { validate } = require('../../middleware/validate');
const { HttpError } = require('../../middleware/errors');
const { issueSession, clearSession, requireAuth } = require('../../middleware/auth');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

router.post('/register', limiter, validate({
  name: { type: 'string', required: true, min: 2, max: 80 },
  email: { type: 'email', required: true, max: 160 },
  password: { type: 'string', required: true, min: 8, max: 128 },
}), (req, res) => {
  const { name, email, password } = req.body;
  if (get().prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    throw new HttpError(409, 'An account with this email already exists.');
  }
  const r = get().prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
    .run(email.trim(), bcrypt.hashSync(password, 12), name.trim());
  const user = get().prepare('SELECT * FROM users WHERE id = ?').get(Number(r.lastInsertRowid));
  // Attach any guest orders placed with this email.
  get().prepare('UPDATE orders SET user_id = ? WHERE email = ? AND user_id IS NULL').run(user.id, user.email);
  issueSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', limiter, validate({
  email: { type: 'email', required: true },
  password: { type: 'string', required: true },
}), (req, res) => {
  const user = get().prepare('SELECT * FROM users WHERE email = ?').get(req.body.email.trim());
  if (!user || !bcrypt.compareSync(req.body.password, user.password_hash)) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;

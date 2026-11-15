import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { get } from './db.js';

const SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET not set: using a random one, so sessions reset on restart.');
}
const SESSION_HOURS = 12;
export const COOKIE = 'pa_session';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

const sign = (payload) => createHmac('sha256', SECRET).update(payload).digest('base64url');

/** Stateless signed token: base64url(json).signature */
export function issueToken(user) {
  const body = Buffer.from(JSON.stringify({
    uid: user.id, role: user.role, exp: Date.now() + SESSION_HOURS * 3600_000,
  })).toString('base64url');
  return `${body}.${sign(body)}`;
}

function readToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return data.exp > Date.now() ? data : null;
}

function cookieValue(req, name) {
  const match = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function sessionCookie(token, maxAgeSeconds = SESSION_HOURS * 3600) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

const RANK = { viewer: 1, editor: 2, admin: 3 };

/** Express middleware: requires a valid session with at least `minRole`. */
export function requireRole(minRole = 'viewer') {
  return (req, res, next) => {
    const data = readToken(cookieValue(req, COOKIE));
    if (!data) return res.status(401).json({ error: 'Not signed in' });
    // Re-read the user so deactivation and role changes take effect immediately.
    const user = get('SELECT id, email, name, role, active FROM users WHERE id = ?', data.uid);
    if (!user || !user.active) return res.status(401).json({ error: 'Account disabled' });
    if (RANK[user.role] < RANK[minRole]) return res.status(403).json({ error: `Requires ${minRole} role` });
    req.user = user;
    next();
  };
}

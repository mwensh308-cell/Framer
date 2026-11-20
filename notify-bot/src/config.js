// Settings come from the environment (or a .env file beside package.json).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const list = (v) => (v || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);

export function loadEnvFile(file = path.join(ROOT, '.env')) {
  try {
    process.loadEnvFile(file);
  } catch {
    // No .env: the environment alone is used.
  }
}

export function loadConfig(env = process.env) {
  return {
    token: env.TELEGRAM_BOT_TOKEN || '',
    apiBase: env.TELEGRAM_API || 'https://api.telegram.org',
    // Telegram user ids that may read the notifications; each also gets them forwarded.
    owners: list(env.OWNERS),
    // The secret the phone sends with every notification.
    deviceToken: env.DEVICE_TOKEN || '',
    host: env.HOST || '0.0.0.0',
    port: num(env.PORT, 8787),
    db: path.resolve(env.DB_FILE || path.join(ROOT, 'data', 'notifications.db')),
    // Days to keep notifications; 0 keeps them forever.
    keepDays: num(env.KEEP_DAYS, 0),
    timeZone: env.TZ_NAME || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

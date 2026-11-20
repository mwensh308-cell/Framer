// Settings come from the environment (or a .env file beside package.json).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function list(value) {
  return (value || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadEnvFile(file = path.join(ROOT, '.env')) {
  try {
    process.loadEnvFile(file);
  } catch {
    // No .env file: the environment alone is used.
  }
}

export function loadConfig(env = process.env) {
  return {
    token: env.TELEGRAM_BOT_TOKEN || '',
    apiBase: env.TELEGRAM_API || 'https://api.telegram.org',
    // Telegram user ids allowed to use the bot. Empty = nobody (the bot runs code on this machine).
    allowedUsers: new Set(list(env.ALLOWED_USERS)),
    agent: env.AGENT || 'claude-code',
    // The agent's program when it isn't on PATH under its usual name.
    agentProgram: env.AGENT_PROGRAM || '',
    agentArgs: list(env.AGENT_ARGS),
    model: env.AGENT_MODEL || '',
    dataDir: path.resolve(env.DATA_DIR || path.join(ROOT, 'data')),
    maxRounds: num(env.MAX_ROUNDS, 4),
    goodEnough: num(env.GOOD_ENOUGH, 85),
    maxRuns: num(env.MAX_RUNS, 2),
    turnTimeoutMs: num(env.TURN_TIMEOUT_MIN, 30) * 60_000,
    widths: list(env.WIDTHS || '1280,390').map(Number).filter((w) => w > 0),
  };
}

// Checks judge a build by what can be measured — it builds, it serves, it looks alike — never by
// what the builder says about it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { serveDir } from './serve.js';
import { capture, similarity, withBrowser } from './visual.js';

/** Runs a command in `cwd`; resolves with its exit and the end of its output. */
export function run(cmd, args, { cwd, signal, timeoutMs = 10 * 60_000 }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, CI: '1', FORCE_COLOR: '0' }, signal });
    let out = '';
    const keep = (d) => {
      out = (out + d).slice(-6000);
    };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: -1, out: e.code === 'ENOENT' ? `${cmd} isn't installed.` : e.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, out: out.trim() });
    });
  });
}

const has = (dir, f) => fs.existsSync(path.join(dir, f));

/** Builds whatever app/ holds, the way its own files say to. */
export async function build(app, signal) {
  if (!fs.existsSync(app) || !fs.readdirSync(app).some((f) => !f.startsWith('.'))) {
    return { ok: false, note: 'app/ is empty: nothing has been written yet. Write the project in app/.' };
  }
  const steps = [];
  if (has(app, 'package.json')) {
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
    } catch (e) {
      return { ok: false, note: `app/package.json isn't valid JSON: ${e.message}` };
    }
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    if (deps.length && !has(app, 'node_modules')) steps.push(['npm', ['install', '--no-audit', '--no-fund']]);
    if (pkg.scripts?.build) steps.push(['npm', ['run', 'build']]);
  } else if (has(app, 'Cargo.toml')) steps.push(['cargo', ['build']]);
  else if (has(app, 'go.mod')) steps.push(['go', ['build', './...']]);
  else if (fs.readdirSync(app).some((f) => f.endsWith('.py'))) steps.push(['python3', ['-m', 'compileall', '-q', '.']]);
  for (const [cmd, args] of steps) {
    const r = await run(cmd, args, { cwd: app, signal });
    if (r.code !== 0) return { ok: false, note: `\`${cmd} ${args.join(' ')}\` failed:\n${r.out.slice(-2500)}` };
  }
  return { ok: true, note: steps.length ? 'The build succeeded.' : 'Nothing to build: the files are used as they are.' };
}

/** The folder of a built site: app/dist, app/out, app/build, or app/ itself. */
export function siteDir(app) {
  return ['dist', 'out', 'build', '.'].map((d) => path.join(app, d)).find((d) => fs.existsSync(path.join(d, 'index.html'))) || null;
}

function result(id, round, passed, note, extra = {}) {
  return { id, round, passed, note, similarity: null, shots: [], at: new Date().toISOString(), ...extra };
}

/** Any project: it must build. */
export async function buildCheck(project, round, { signal }) {
  const b = await build(project.app, signal);
  return result('build', round, b.ok, b.note);
}

/**
 * A website: it must build and serve; with an original studied, its screenshots are compared at
 * each width and the original's headings looked for.
 */
export async function siteCheck(project, round, { signal, widths }) {
  const b = await build(project.app, signal);
  if (!b.ok) return result('site', round, false, b.note);
  const dir = siteDir(project.app);
  if (!dir) return result('site', round, false, 'The build left no index.html in app/dist, app/out, app/build or app/. A website must build to static files.');
  const out = path.join(project.checksDir, `round-${round}`);
  await fsp.rm(out, { recursive: true, force: true });
  const server = await serveDir(dir);
  try {
    const original = readCapture(project.captureDir);
    const measured = await withBrowser(async (browser) => {
      const shots = await capture(browser, server.url, out, widths);
      const scores = [];
      for (const s of shots) {
        const theirs = path.join(project.captureDir, `screenshot-${s.width}.png`);
        if (fs.existsSync(theirs)) scores.push({ width: s.width, score: await similarity(browser, theirs, s.file) });
      }
      return { shots, scores };
    });
    if (!measured) return result('site', round, true, `${b.note} No browser is installed here, so it wasn't compared with the original.`);
    const { shots, scores } = measured;
    const built = shots.flatMap((s) => s.headings).map((h) => h.toLowerCase());
    const missing = (original?.shots?.[0]?.headings || []).filter((h) => !built.some((x) => x.includes(h.toLowerCase().slice(0, 40)))).slice(0, 10);
    if (!scores.length) return result('site', round, true, `${b.note} It serves and was photographed${shots.length ? '' : ' (no screenshots)'}.`, { shots: shots.map((s) => s.file) });
    const avg = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
    const per = scores.map((s) => `${s.width}px: ${s.score}%`).join(', ');
    const note = `Looks about ${avg}% alike (${per}).${missing.length ? ` Headings of the original not found in the build: ${missing.map((h) => `"${h}"`).join(', ')}.` : ''}`;
    return result('site', round, true, note, { similarity: avg, missing, shots: shots.map((s) => s.file) });
  } finally {
    server.close();
  }
}

function readCapture(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Good enough to stop refining. */
export function good(check, goodEnough) {
  return check.passed && (check.similarity == null || check.similarity >= goodEnough);
}

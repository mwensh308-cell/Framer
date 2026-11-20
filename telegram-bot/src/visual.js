// Screenshots and a likeness estimate, through Playwright when it's installed. Without it the bot
// still builds and checks; it just can't compare pictures.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let pw;

export function playwright() {
  if (pw === undefined) {
    try {
      pw = require('playwright');
    } catch {
      pw = null;
    }
  }
  return pw;
}

/** Runs `fn(browser)`; null when there's no browser. */
export async function withBrowser(fn) {
  const p = playwright();
  if (!p) return null;
  const browser = await p.chromium.launch();
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

const MAX_HEIGHT = 4000; // Long pages are cut, so the picture stays readable on a phone.

/** Captures `url` at each width into `outDir`: screenshot-<width>.png and what the page shows. */
export async function capture(browser, url, outDir, widths) {
  await fs.mkdir(outDir, { recursive: true });
  const shots = [];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45_000 }));
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => ({
        title: document.title,
        height: document.documentElement.scrollHeight,
        headings: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 40),
        buttons: [...document.querySelectorAll('a,button')].map((e) => e.innerText.trim()).filter((t) => t && t.length < 40).slice(0, 40),
      }));
      const file = path.join(outDir, `screenshot-${width}.png`);
      await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(Math.max(info.height, 1), MAX_HEIGHT) } });
      shots.push({ width, file, ...info });
    } finally {
      await page.close();
    }
  }
  await fs.writeFile(path.join(outDir, 'capture.json'), JSON.stringify({ url, shots: shots.map(({ file, ...s }) => ({ ...s, file: path.basename(file) })) }, null, 2));
  return shots;
}

/**
 * How alike two screenshots look, 0-100: both are shrunk to the same width, their overlapping top
 * compared pixel by pixel, and their heights compared. An estimate, not a verdict.
 */
export async function similarity(browser, fileA, fileB) {
  const [a, b] = await Promise.all([fileA, fileB].map(async (f) => `data:image/png;base64,${(await fs.readFile(f)).toString('base64')}`));
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ([a, b]) => {
        const load = (src) => new Promise((ok, no) => Object.assign(new Image(), { onload() { ok(this); }, onerror: no, src }));
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = 96;
        const ha = Math.round((ia.height * w) / ia.width);
        const hb = Math.round((ib.height * w) / ib.width);
        const h = Math.max(1, Math.min(ha, hb, 400));
        const gray = (img) => {
          const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0, img.width, (h * img.width) / w, 0, 0, w, h);
          const d = g.getImageData(0, 0, w, h).data;
          const out = new Float32Array(w * h);
          for (let i = 0; i < out.length; i++) out[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
          return out;
        };
        const ga = gray(ia);
        const gb = gray(ib);
        let diff = 0;
        for (let i = 0; i < ga.length; i++) diff += Math.abs(ga[i] - gb[i]);
        const pixels = Math.max(0, 1 - (2.5 * diff) / ga.length / 255);
        const heights = Math.min(ha, hb) / Math.max(ha, hb);
        return Math.round(100 * (0.75 * pixels + 0.25 * heights));
      },
      [a, b],
    );
  } finally {
    await page.close();
  }
}

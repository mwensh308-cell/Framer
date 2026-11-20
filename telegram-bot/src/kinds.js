// What is being made (like Craft Anything's TargetKind): how a request is recognised, the default
// stack, what the builder is told, which checks judge it, and the next round's message.
import { buildCheck, siteCheck } from './checks.js';

export const URL_RE = /https?:\/\/[^\s<>"']+/i;

const pad = (s) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
const says = (text, words) => words.some((w) => pad(text).includes(` ${w} `));

export const STACKS = [
  { name: 'Static HTML', asked: ['html', 'vanilla', 'plain html', 'بدون إطار', 'بدون framework'], steps: 'Write plain index.html, CSS and JavaScript in app/ with no build step and no dependencies.' },
  { name: 'Vite + React', asked: ['react', 'رياكت'], steps: 'Create a Vite + React project in app/ (package.json with a "build" script), run `npm install` and `npm run build` from app/ until it succeeds; the output goes to app/dist.' },
  { name: 'Vite + Vue', asked: ['vue', 'فيو'], steps: 'Create a Vite + Vue project in app/ with a "build" script, run `npm install` and `npm run build` until it succeeds; the output goes to app/dist.' },
  { name: 'Vite + Svelte', asked: ['svelte'], steps: 'Create a Vite + Svelte project in app/ with a "build" script, run `npm install` and `npm run build` until it succeeds; the output goes to app/dist.' },
  { name: 'Phaser', asked: ['phaser', 'game', 'لعبة', 'لعبه'], steps: 'Make a browser game with Phaser 3 bundled by Vite in app/ (a "build" script), run `npm install` and `npm run build` until it succeeds; the output goes to app/dist.' },
];

export function namedStack(request) {
  return STACKS.find((s) => says(request, s.asked)) || null;
}

export const website = {
  id: 'website',
  label: 'موقع',
  detect: (request, target) => (target ? 100 : says(request, ['website', 'site', 'landing', 'page', 'موقع', 'صفحة', 'صفحه', 'متجر', 'سایت']) ? 60 : null),
  defaultStack: 'Vite + React',
  goal: (target) => (target ? `a website that looks and works like ${target}` : 'the website the request describes'),
  sections: () => [
    'The result must build to static files (app/dist, app/out or app/build with index.html at the top, or a plain app/index.html) that work when served as static files from that folder. Use relative asset paths (Vite: base "./").',
  ],
  checks: () => [siteCheck],
  refine(check, round) {
    if (!check.passed) return `Check ${round}: the build isn't working.\n${check.note}\n\nFix this in app/, build again until it succeeds, and reply with 1-2 plain sentences on what you changed.`;
    return `Check ${round}: ${check.note}\nYour build's screenshots are in checks/round-${round}/ (screenshot-<width>.png) and the original's in capture/. Open each pair with the Read tool, fix the biggest visible differences first (layout and section order, spacing, sizes, colours, fonts, missing parts), add any missing headings, build again, and reply with 1-2 plain sentences on what you changed.`;
  },
};

export const app = {
  id: 'app',
  label: 'تطبيق',
  detect: () => 1,
  defaultStack: "Builder's choice",
  goal: () => 'the program the request describes',
  sections: () => ['Make it build with its own standard command (npm run build, cargo build, go build…) and add a short app/README.md saying how to run it.'],
  checks: () => [buildCheck],
  refine: (check, round) => `Check ${round}: ${check.note}\n\nFix this in app/, build again until it succeeds, and reply with 1-2 plain sentences on what you changed.`,
};

export const KINDS = [website, app];

/** The kind and stack for a request: the strongest detection wins. */
export function choose(request, target) {
  let best = null;
  let score = -1;
  for (const k of KINDS) {
    const s = k.detect(request, target);
    if (s != null && s > score) [best, score] = [k, s];
  }
  const stack = namedStack(request)?.name || best.defaultStack;
  return { kind: best, stack };
}

export const kindById = (id) => KINDS.find((k) => k.id === id) || app;

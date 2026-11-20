// Study: look at the original before the first build and write the notes the builder reads in
// capture/: README.md (an outline), page.html, and screenshots with capture.json when a browser is
// available.
import fs from 'node:fs/promises';
import path from 'node:path';
import { capture, withBrowser } from './visual.js';

const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** What a page's HTML says about itself, without running it. */
export function outline(html) {
  const one = (re) => strip(html.match(re)?.[1] || '');
  const all = (re, n) => [...html.matchAll(re)].map((m) => strip(m[1])).filter(Boolean).slice(0, n);
  const count = (re) => (html.match(re) || []).length;
  const colours = {};
  for (const m of html.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)/g)) colours[m[0].toLowerCase()] = (colours[m[0].toLowerCase()] || 0) + 1;
  const fonts = new Set();
  for (const m of html.matchAll(/font-family\s*:\s*([^;"}]+)/gi)) fonts.add(m[1].trim());
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"&']+)/g)) fonts.add(decodeURIComponent(m[1]).replace(/\+/g, ' '));
  return {
    title: one(/<title[^>]*>([\s\S]*?)<\/title>/i),
    description: (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || '',
    lang: (html.match(/<html[^>]+lang=["']([^"']+)/i) || [])[1] || '',
    headings: all(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, 40),
    nav: all(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, 3).map((t) => t.slice(0, 300)),
    sections: count(/<section\b/gi),
    images: count(/<img\b/gi),
    forms: count(/<form\b/gi),
    colours: Object.entries(colours).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c),
    fonts: [...fonts].slice(0, 6),
    // What it's built with, from its script and style addresses.
    builtWith: [
      /\/_next\//.test(html) && 'Next.js',
      /\/_nuxt\//.test(html) && 'Nuxt',
      /wp-content/.test(html) && 'WordPress',
      /data-reactroot|react/i.test(html) && 'React',
      /tailwind/i.test(html) && 'Tailwind CSS',
      /bootstrap/i.test(html) && 'Bootstrap',
    ].filter(Boolean),
  };
}

function readme(url, o, shots) {
  const list = (xs) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : '- (none found)');
  return `# The original: ${url}

Title: ${o.title || '(none)'}
Description: ${o.description || '(none)'}
Language: ${o.lang || '(not stated)'}
Seems built with: ${o.builtWith.join(', ') || '(unknown)'}
Sections: ${o.sections} · images: ${o.images} · forms: ${o.forms}

## Headings, in order
${list(o.headings)}

## Navigation
${list(o.nav)}

## Most used colours
${list(o.colours)}

## Fonts
${list(o.fonts)}

## Screenshots
${shots.length ? shots.map((s) => `- screenshot-${s.width}.png: ${s.width}px wide, page ${s.height}px tall`).join('\n') : '- (no browser was available, so there are none: work from page.html and this outline)'}

page.html is the HTML the server sent. Rebuild the layout, styling and behaviour yourself from this
evidence; don't copy logos, photos, brand names or long passages of text.
`;
}

export async function study(project, { widths, onStep = () => {}, fetchImpl = fetch }) {
  const dir = project.captureDir;
  await fs.mkdir(dir, { recursive: true });
  const url = project.state.target;
  if (!url) {
    await fs.writeFile(path.join(dir, 'README.md'), '# No original\n\nThere is nothing to recreate: build what the request asks for.\n');
    return { ok: true, note: 'Nothing to study: building from the request.' };
  }
  onStep(`Reading ${url}…`);
  let html = '';
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; craft-telegram-bot)' }, signal: AbortSignal.timeout(30_000) });
    html = await res.text();
  } catch (e) {
    onStep(`Couldn't read the page's HTML (${e.message}); trying the browser.`);
  }
  await fs.writeFile(path.join(dir, 'page.html'), html);
  let shots = [];
  try {
    onStep('Taking screenshots of the original…');
    shots = (await withBrowser((b) => capture(b, url, dir, widths))) || [];
  } catch (e) {
    onStep(`Screenshots failed: ${e.message}`);
  }
  const o = outline(html);
  // A page drawn by scripts shows its headings only in the browser.
  if (!o.headings.length && shots[0]?.headings?.length) o.headings = shots[0].headings;
  if (!o.title && shots[0]?.title) o.title = shots[0].title;
  await fs.writeFile(path.join(dir, 'README.md'), readme(url, o, shots));
  if (!html && !shots.length) return { ok: false, note: `Couldn't open ${url}.` };
  return { ok: true, note: `Studied ${o.title || url}: ${o.headings.length} headings, ${shots.length} screenshots.`, shots };
}

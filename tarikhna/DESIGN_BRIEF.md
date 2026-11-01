# Tarikhna (تاريخنا) — 3D & Motion Design Brief

> **Concept:** *"Every goal is a story, every generation a chapter."*
> A night-blue museum of Egyptian football. History floats in 3D around a golden ball, and the visitor scrolls through time.
> Status: v2 shipped on branch `claude/egyptian-league-history-site-tjaflm` · live at https://tarikhna.vercel.app

---

## 1. Layout structure

| # | Section | Purpose | Motion |
|---|---|---|---|
| 0 | **Reading-progress bar** | Shows how far you are in the page | CSS `animation-timeline: scroll()` (no JS) |
| 1 | **Header** (sticky, glass) | 9 nav links, search, theme toggle; mobile drawer | — |
| 2 | **3D Hero** | Brand moment: name, promise, search, two CTAs | Canvas geodesic ball with 10 milestone years orbiting in 3D; parallax pyramids; staggered text rise |
| 3 | **Stat strip** | 4 headline numbers | Count-up on first view |
| 4 | **Scrollytelling: "The story in six chapters"** | 1907 → 2026 narrative | Sticky panel; the year flips in 3D as each chapter enters; progress track fills |
| 5 | **Site sections** | 6 entry cards | 3D tilt with specular sheen (no logos on these cards) |
| 6 | **From the archive** | Photo masonry + featured video | Reveal-in-depth; hover zoom; lightbox |
| 7 | **Clubs that made history** | 6 club cards with logos | Reveal only; **no tilt, so logos are never skewed** |
| 8 | **Legends** | 3 player bios | Tilt + reveal |
| 9 | **Latest news** | 3 news cards | Reveal |
| 10 | **Instagram @mxnasserrr** | Social feed and follow CTA | Staggered tiles |
| 11 | **Footer** | About, links, IG handle, logo-kit link | — |

New pages: **`gallery.html`** (filterable media wall and video grid) and **`brand.html`** (club logo kit and usage rules).

## 2. Color palette

| Token | Light | Dark | Role |
|---|---|---|---|
| `--night` | `#071C2C` | `#071C2C` | Hero, story, stage backgrounds |
| `--nile` | `#0F3D5E` | `#7FB6DD` | Primary actions, numbers, active nav |
| `--gold` / `--gold-2` | `#B8862B` / `#D9A441` | `#E0B25A` / `#F0C673` | Pharaonic accent, 3D ball, headline gradient |
| `--bg` (papyrus) | `#FBF7EF` | `#12100D` | Page background |
| `--surface` | `#FFFFFF` | `#1B1915` | Cards |
| `--red` (flag) | `#B3202E` | `#E5636E` | Breaking news, progress gradient end |
| `--ink` | `#1C1A17` | `#F2ECDF` | Body text (≥ 12:1 on bg) |

Gradients: the headline uses papyrus → gold (`#FFF6E1 → #F0C673 → #B8862B`), and the hero sky uses a radial Nile → night blend. Club colors appear **only** in club context (crests, media stand-ins). They are never used as UI chrome.

## 3. Typography

| Use | Chosen | Alternatives | Why |
|---|---|---|---|
| Display / headings | **Reem Kufi** 600–700 | *Lalezar* (bolder, more poster), *Aref Ruqaa* (heritage feel, headings only) | Geometric Kufic echoes ancient inscriptions and stays crisp at 7rem |
| Body / UI | **Cairo** 400–800 | *IBM Plex Sans Arabic* (more neutral), *Tajawal* (lighter, compact) | Wide x-height and clear numerals; reads well at 15px on phones |
| Numbers | Cairo `tabular-nums` | — | Scores and years align in tables and counters |

Scale: `clamp()` from 1rem body (17px) to 7rem hero. Line-height 1.8 for Arabic body text and 1.05–1.35 for display. Only two families (6 weights) are loaded with `display=swap`. Phase 2 self-hosts Arabic-subset WOFF2 files (about 60KB in total).

## 4. Animation direction

**Principles:** *calm, weighty, purposeful*. Motion explains time, depth and hierarchy, never decorates for its own sake.

| Pattern | Spec |
|---|---|
| Easing | `cubic-bezier(.2,.8,.2,1)` everywhere (`--ease`) |
| Hero entrance | eyebrow → title → lead → search → CTAs, 120ms stagger, 900ms rise of 24px |
| 3D ball | 42-vertex geodesic sphere in Canvas 2D, ~0.25 rad/s spin; the pointer tilts it gently; year labels orbit on a tilted ring with depth-scaled size and opacity |
| Parallax | Grain 0.2×, pyramids 0.6× (pointer and scroll) using `translate3d` only |
| Reveal | From `translateY(40px) translateZ(-60px) rotateX(8deg)` to rest in 800ms; children staggered 80ms |
| Tilt | ±6° max, plus a radial specular highlight following the cursor; fine pointers only |
| Story year | 3D flip `rotateX(-80deg) → 0` in 700ms when a chapter crosses the viewport center |
| Counters | Ease-out cubic over 1.4s, once |
| Video CTA | Soft pulse ring, 2.4s |

**Performance guardrails:**
- Only `transform` and `opacity` are animated, so there is no layout thrash.
- The canvas pauses when off-screen (IntersectionObserver) or when the tab is hidden, and DPR is capped at 2.
- Zero animation libraries: `motion.js` is about 12KB unminified (~4KB gzipped) and dependency-free. There is no Three.js on purpose (it would add ~600KB for an effect Canvas 2D handles).
- **`prefers-reduced-motion`**: the canvas renders one static frame, and reveals, tilt, parallax and counters are disabled. All content stays fully visible (verified).

## 5. Media handling plan (photos and videos)

| Step | Rule |
|---|---|
| Source | Licensed archive only (Al-Ahram archive, club media offices, EFA, agencies). Every item in `data/media.json` carries `credit` and `license` |
| Photos | AVIF, then WebP, then JPEG; 3 widths (480/960/1600) via `srcset`; explicit `width`/`height` (no CLS); `loading="lazy"` and `decoding="async"` |
| Stand-ins | Until a licensed file exists, the build renders a sub-1KB SVG card (year, title, club color). It is labelled as a temporary illustration, never presented as a real photo |
| Video | Poster first. The `<video>` (self-hosted MP4/H.264 + WebM, `preload="metadata"`) or a privacy-enhanced YouTube embed is created **only on click**. Arabic WebVTT captions are supported via `captions` |
| Viewer | Native `<dialog>` lightbox with focus trap, Esc to close, arrow keys (RTL-aware), and focus returned to the tile |
| Budget | Home page under 250KB before media; LCP image under 120KB; no video bytes before a click |

## 6. Instagram / social feed (@mxnasserrr)

- **Section:** gradient avatar ring, handle link, Follow CTA, and a 6-tile grid linking to `instagram.com/mxnasserrr`. The handle also appears in the footer and in `sameAs` JSON-LD.
- **Real posts:** add public post URLs to `data/social.json → instagram.posts`. They render as official Instagram embeds **only after the visitor clicks "Show posts"**, because Instagram sets third-party cookies. This also keeps the page fast.
- **Live auto-feed (optional, phase 2):** the Instagram Graph API needs a Business/Creator account, a Meta app and a long-lived token. Run a serverless function (Vercel) that caches the latest 9 posts every 6h. **Never ship the token to the browser.**

## 7. Logo kit and brand integrity

- **Official files only.** Drop `assets/logos/<club-id>.svg` (or `.png`) into the repo, and every page swaps from the monogram to the real crest at the next build. Get files and written permission from each club's media office.
- **Today:** no official logos are bundled (they are trademarks). Each club shows a monogram in its colors, labelled *"temporary symbol, not the official logo"* on `brand.html`.
- **Rules (enforced in code and on `brand.html`):** clear space = 25% of logo height; minimum 32px; neutral light/dark tiles only; no recoloring, stretching, rotating, shadows, outlines or animation; equal size when side by side; no implied sponsorship. Club cards deliberately have **no 3D tilt** so logos are never distorted.

## 8. Accessibility

- WCAG 2.1 AA: text contrast ≥ 4.5:1 in both themes; gold text only appears on dark navy.
- `lang="ar" dir="rtl"`; skip link; landmarks; one H1 per page.
- Keyboard: every tile, chip and player is a real `<button>`; visible focus rings; the lightbox is a native modal `<dialog>`.
- Screen readers: the decorative canvas and parallax use `aria-hidden`; media has descriptive `alt`/`aria-label`; the player status uses `aria-live`; filter chips use `aria-pressed`.
- Motion: full `prefers-reduced-motion` support, and nothing flashes more than 3 times per second.
- Touch targets ≥ 40–44px; no hover-only information.

## 9. Sample UI copy

| Slot | Arabic (live) | English gloss |
|---|---|---|
| Hero eyebrow | ذاكرة الكرة المصرية · منذ 1907 | Egypt's football memory · since 1907 |
| Hero H1 | تاريخنا | Our History |
| Hero lead | كل هدف حكاية، وكل جيل فصل… | Every goal is a story, every generation a chapter… |
| CTAs | ابدأ الرحلة · شاهد المعرض | Start the journey · Watch the gallery |
| Story title | الحكاية في ستة فصول | The story in six chapters |
| Chapter 2 | الفصل الثاني: أول العرب في المونديال | Chapter two: the first Arabs at the World Cup |
| Gallery intro | صور تاريخية ومقاطع خالدة، تُحمَّل عند الحاجة فقط. | Historic photos and timeless clips, loaded only when needed. |
| Video pending | سيُضاف هذا المقطع بعد الحصول على ترخيص النشر. | This clip will be added once publishing rights are cleared. |
| Instagram | تابع الحكاية على إنستغرام · @mxnasserrr | Follow the story on Instagram |
| IG consent | تُعرض المنشورات من خوادم إنستغرام… [عرض المنشورات] | Posts load from Instagram's servers… [Show posts] |
| Logo kit | نعرض شعارات الأندية كما هي، دون أي تعديل، وبإذن أصحابها. | We show club crests as-is, unaltered, with permission. |

## 10. Component list

| Component | File / hook | Notes |
|---|---|---|
| Header | `page()` in `tools/build.py` | Sticky glass, drawer < 980px, theme toggle |
| Progress bar | `.progress` | CSS scroll timeline |
| Hero 3D | `HERO3D`, `#ball3d`, `motion.js §1–2` | Canvas ball and parallax layers |
| Stat counter | `[data-count]` | Count-up on view |
| Story | `.story`, `.chapter`, `motion.js §5` | Sticky year flip |
| Tilt card | `[data-tilt]` | Not used on logo cards |
| Gallery | `gallery_tile()`, `.gallery`, `.chipbar` | Masonry columns and filter chips |
| Lightbox | `LIGHTBOX`, `motion.js §6` | `<dialog>` |
| Video player | `video_player()`, `motion.js §8` | Poster, then MP4 or YouTube on click; captions |
| Logo kit | `official_logo()`, `crest()`, `brand.html` | Auto-swaps to official files |
| Social feed | `instagram_section()`, `data/social.json` | Consent-gated embeds |
| Footer | `page()` | Links, IG handle, last-updated stamp |

## 11. Timeline (development and QA)

| Week | Track | Deliverables | Exit criteria |
|---|---|---|---|
| 1 | Design | Moodboard, tokens, type test (Reem Kufi vs Lalezar), hero motion study | Sign-off on hero and palette |
| 2 | Build v2 | Hero 3D, story, gallery, player, logo kit, IG section ✅ *(done in this commit)* | Builds clean; no console errors |
| 3 | Rights and media | License 20 photos and 6 clips; collect official logos from 12 clubs | `credit`/`license` filled in for every item |
| 4 | Media pipeline | AVIF/WebP generation script, captions (VTT), posters | LCP image under 120KB |
| 5 | Social | Add IG post URLs; optional Graph-API cached function | Embeds load only after consent |
| 6 | QA | Cross-browser (Chrome, Safari iOS, Firefox, Samsung Internet), axe and keyboard audit, reduced-motion pass, Lighthouse | Perf ≥ 90, A11y ≥ 95, CLS < 0.05 on mid-range Android |
| 7 | Launch | Custom domain, Search Console, analytics | Production deploy plus rollback plan |

**QA checklist (automated in this session):** no JS errors on 2 viewports; no horizontal overflow on home, gallery, club, players, archive and search; lightbox opens with the correct caption; video placeholder message works; gallery filter shows 3 videos; reduced-motion keeps all content visible.

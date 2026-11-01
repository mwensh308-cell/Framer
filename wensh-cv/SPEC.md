# WENSH // CV: one-page specification

**Client:** Mostafa Nasser (Wensh), mwensh308@gmail.com, Instagram [@mxnasserrr](https://www.instagram.com/mxnasserrr/)
**Deliverable:** A single-page 3D CV site. The reference build is in this folder (`index.html`, `styles.css`, `main.js`, `assets/`).
**Concept:** *"hello, friend."* The site works like a quiet terminal session at 3 a.m. Mostafa's portrait is rebuilt as a 3D point cloud, and it glitches, follows the cursor and breaks up into a drifting data field as you scroll. The look takes its cues from the mood of *Mr. Robot*: a black void, red signal colour, monospace text, datamosh glitches and fourth-wall asides. **It uses no show logos, masks or trademarked marks.** Everything is original and keeps the homage.

---

## 0. Architecture & user flow

| # | Anchor | Terminal metaphor | Content |
|---|---|---|---|
| — | boot overlay | `ssh wensh@cairo` | 2.2 s scripted log. Skippable with any key or click. Shown once per session. |
| 00 | `#hero` | — | Name, alias, cycling role typer, CTAs (`./run cv`, `@mxnasserrr`), status bar |
| 01 | `#whoami` | `$ whoami` | Professional summary and four at-a-glance stats |
| 02 | `#experience` | `$ tail -f experience.log` | Media Buyer · Talabat · Elsewedy Electric |
| 03 | `#education` | `$ cat education.txt` | Helwan University, B.Sc. Mechatronics, plus the graduation project |
| 04 | `#skills` | `$ ls ./modules` | 5 skill "modules" shown as chips |
| 05 | `#projects` | `$ ps aux \| grep projects` | Grad project (featured) · WenshPro · El Alameya · Freelance · Security research |
| 06 | `#awards` | `$ gpg --list-keys` | Cisco Cybersecurity · responsible disclosures · languages |
| 07 | `#contact` | `$ ./connect --to wensh` | "Are you a 1 or a 0?", plus email (copy), Instagram, web and location |

**Flow:** boot → the portrait assembles from noise → the visitor reads the name and role → **Primary CTA** scrolls to the CV, **Secondary CTA** opens Instagram → the portrait dissolves into the background field while each section "executes" (heading glitch, then cards stagger in) → contact. The sticky nav shows the current section and turns into a menu button under 760 px.

## Colour palette (dark-only by concept)

| Token | Hex | Role | Contrast on void |
|---|---|---|---|
| `--void` | `#080808` | Background | — |
| `--ink` | `#111214` | Card surfaces (72% alpha + blur) | — |
| `--line` | `#24262A` | Hairlines and borders | — |
| `--bone` | `#E8E6E1` | Primary text, portrait highlights | 17.6 : 1 |
| `--ash` | `#9A9A96` | Secondary text | 7.1 : 1 |
| `--red` | `#E0312A` | Signal colour: CTA, indices, glitch channel | 5.0 : 1 |
| `--term` | `#39FF88` | Terminal accent: prompts, status, focus ring | 14.9 : 1 |

## Typography

- **Display:** *Archivo* (variable, `wdth` 62–125, `wght` 400–900). Headlines use condensed 62–72% width, 800–900 weight, upper case and tight leading (0.82–0.92).
- **Body / UI:** *JetBrains Mono* 400/500/700. The scale is 12 (meta) · 13 (nav) · 16 (body) · 18–22 (contact), plus fluid `clamp()` for the display sizes (H1 64→196 px, H2 34→84 px).
- Both load from Google Fonts with `display=swap`, and system fallbacks are defined.

---

## 1. Hero: motion-graphics concept

1. **Boot (0–2.2 s):** green log lines type in, then a red `[ !! ] anomaly detected` line, then a white `hello, friend.` The overlay fades out over 500 ms.
2. **Assemble (0–2.4 s after boot):** about 30k points (about 7k on mobile) fly in from a random 18×12×10 volume to their portrait positions. Each point gets a staggered ease-out-cubic delay (`aRnd.y`).
3. **Idle:** each point breathes along the z axis with a sine wave (±0.035). The role typer cycles six roles, a red/green RGB-split glitch hits the H1 every 6–11 s, and the shader datamosh band fires every 3–7 s.
4. **Scroll (0 → 0.9 viewport):** the portrait rotates by up to 0.6 rad and dissolves into a slow upward-drifting **data field** at 38% opacity. Sparse red "packets" in the field show that the session is still running behind the CV.

## 2. 3D interaction ideas

| Layer | Technique | Detail |
|---|---|---|
| **Particle portrait** | `THREE.Points` + custom `ShaderMaterial` | Each point's depth comes from its luminance (`z = lum·1.1`). An elliptical vignette dissolves the photo's edges. Point size depends on luminance and distance. |
| **Cursor repulsion** | Vertex shader | Points within 1 world unit of the cursor are pushed outward by 0.42 and toward the camera by 0.8, which reads as a "touching the data" moment. |
| **Datamosh glitch** | Vertex + fragment | The y axis is split into hashed horizontal bands that shift along x and recolour red. Triggers: a random timer, section entry, and the boot handoff. |
| **Parallax** | Group rotation + starfield | The portrait tilts with the pointer (±0.28 rad Y, ±0.12 rad X, lerp 0.06). A 1.4k-point background starfield moves at a different scroll rate, which creates depth. |
| **Card micro-interactions** | CSS 3D | Cards tilt up to ±7° under the pointer, a red radial spotlight follows the cursor, chips glow terminal-green on hover, and buttons get a wipe fill. Fine pointers only. |
| **Text** | CSS | Clip-path slice glitch on the H1 and the contact headline, a blinking caret, and count-up stats. |
| **Future (v2)** | Post-processing | A CRT barrel-distortion and chromatic-aberration pass (EffectComposer), plus an ASCII-render mode toggled with the `~` key as an easter egg. |

## 3. CV content → sections

| CV block | Section | Treatment |
|---|---|---|
| Professional summary | 01 `whoami` | A large lead line plus a paragraph. Stats: **5+** brands (stated in the CV), **2** businesses, **3** roles, **AR/EN** |
| Professional experience | 02 `experience.log` | One "process" card per role (`PID 0x01…`) with `>` bullets |
| Education | 03 | Degree in display type. The graduation project is cross-linked here. |
| Technical skills | 04 `modules` | `mod_01…05`, matching the five CV groups 1:1 |
| Projects & initiatives | 05 | The grad project is the featured full-width card. Status pills: in development / live / ongoing / disclosed. |
| Awards | 06 | **The CV lists no awards.** This section uses Cisco certification, responsible disclosures and languages instead. |

**Content still needed from Mostafa:** (a) employment **dates** for the three roles and the expected graduation year, (b) any **awards** or competition results, (c) screenshots or video of the grad-project rig, (d) a public link for El Alameya Store, (e) the final domain for canonical tags.

## 4. Animation timeline & performance targets

```
t=0.00  HTML + CSS painted (content readable even before JS runs)
t=0.00  boot log starts         ─┐ runs in parallel with three.js fetch + portrait sampling
t≈2.20  boot fades (500ms)       ─┘
t≈2.20  portrait assemble 2.4s · H1 RGB glitch 0.8s · glitch shader 260ms
t≈4.80  role typer starts (55–105ms/char, 1.9s hold, 32ms delete)
scroll  section head enters → shader glitch 140ms + heading/cards reveal 900ms, stagger 70ms
idle    shader glitch every 3.2–7.4s · H1 glitch every 6–11s
```

| Metric | Target | How |
|---|---|---|
| LCP | **< 2.0 s** on 4G | The H1 text is the LCP element, not WebGL. Fonts use preconnect and swap. |
| CLS | **< 0.02** | Fixed canvas, fixed overlays, and image size attributes |
| INP | **< 150 ms** | All listeners are passive. Tilt updates are batched with rAF. |
| JS | ~**170 KB gz** | three.min about 165 KB gz from the CDN with modulepreload, plus about 6 KB of site code |
| Hero asset | **8.5 KB** | A 180×221 grayscale luminance JPG is sampled. The full photo is never loaded on the WebGL path. |
| FPS | **60** desktop / **≥ 45** mid-range mobile | DPR cap 1.75 / 1.5. If the first 90 frames average > 24 ms, DPR drops to 1 automatically. Mobile samples every second pixel. rAF pauses in background tabs. |

## 5. Accessibility & responsive design

- The canvas, boot, grain and scanlines are all `aria-hidden`. **All CV content is real, semantic HTML**: `h1`→`h2`→`h3`, `ol` for experience, `dl` for meta, and `nav` with `aria-current`.
- There is a skip link, and the focus ring is a 2 px terminal-green outline. Every control is a real `<a>` or `<button>`, and touch targets are ≥ 44 px.
- `prefers-reduced-motion`: no boot, no typer, no glitch, no tilt and no reveal transitions. The portrait renders one static frame.
- Every text pairing meets **WCAG 2.2 AA**; see the contrast table above. Colour is never the only signal, because status pills also carry text.
- The copy-email button announces the result through a `role="status"` live region.
- **Fallbacks:** without WebGL or JS, the site shows a duotone `<img>` portrait and the full static CV.
- **Breakpoints:** fluid type and spacing (`clamp`), then **≤ 860 px** single-column summary and **≤ 760 px** menu toggle, single-column projects, a portrait centred behind the hero at 42% opacity, and a hero anchored to the bottom so the name sits in the thumb zone. There is no horizontal scroll at 320 px.
- RTL readiness: `dir` is set on `<html>`, so an Arabic version (`/ar/`) can mirror the layout through logical properties.

## 6. SEO & metadata plan

- `<title>`: *Mostafa Nasser (Wensh) — Mechatronics Engineer & Media Buyer* (57 characters). The meta description is about 155 characters and names the university, WenshPro and the location.
- Canonical is set to `https://wwwensh.online/cv/` **(placeholder; confirm the domain)**.
- **Open Graph `profile`** and Twitter `summary_large_image` use `assets/og-image.jpg` (1200×630).
- **JSON-LD:** a `ProfilePage` with a `Person` entity (`alternateName: Wensh`, `alumniOf`, `hasCredential` for Cisco, `founder` for WenshPro, `knowsAbout`, `knowsLanguage`, `sameAs` for Instagram and the site). Instagram links carry `rel="me"` for identity verification.
- `hreflang` `en` / `ar-EG` alternates arrive once the Arabic version ships. Add a `sitemap.xml` and a `robots.txt` that allows everything.
- Target keywords: "Mostafa Nasser", "Wensh", "mechatronics engineer Egypt", "media buyer Cairo", "WenshPro".

## 7. Asset list, formats & delivery timeline

| Asset | Format | Size | Status |
|---|---|---|---|
| Portrait (source) | JPG 873×1072 progressive | 75 KB | ✅ `assets/portrait.jpg` |
| Portrait (web fallback) | WebP 480w q50 | 10 KB | ✅ `assets/portrait.webp` |
| Portrait luminance map | JPG gray 180×221, auto-contrast | 8.5 KB | ✅ `assets/portrait-depth.jpg` |
| OG / social card | JPG 1200×630 | 70 KB | ✅ `assets/og-image.jpg` (v1; redesign in v2 with brand fonts) |
| Favicon | Inline SVG `>_` | <1 KB | ✅ inline |
| Fonts | Archivo var + JetBrains Mono (Google Fonts, woff2) | ~70 KB | ✅ CDN; self-host in v2 |
| 3D engine | three.js r160 ES module | ~165 KB gz | ✅ jsDelivr CDN |
| Grad-project media | MP4/WebM H.264+VP9 ≤ 6 s loop, 1280w, plus a poster AVIF | ≤ 1.5 MB | ⏳ needed from client |
| Apple touch icon / manifest | PNG 180×180, `site.webmanifest` | — | ⏳ v2 |
| Arabic copy | Text | — | ⏳ v2 |

| Week | Milestone |
|---|---|
| **W1 (done)** | Concept, design tokens, full single-page build, particle portrait, responsive and accessible, SEO base |
| **W2** | Client content pass (dates, awards, project media), real domain, OG card v2, Lighthouse ≥ 95 across all four categories |
| **W3** | v2 effects (CRT post-pass, ASCII easter egg), Arabic `/ar/` version with RTL, analytics (privacy-friendly) |
| **W4** | QA on iOS Safari, Android Chrome and desktop browsers, then launch |

---

### Run locally
```bash
cd wensh-cv && python3 -m http.server 8080
```
Then open http://localhost:8080. It is a static site, so it deploys as-is to Vercel, Netlify, Cloudflare Pages or GitHub Pages.

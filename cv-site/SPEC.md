# Mostafa Nasser · 3D CV Site Spec

**Concept: "The Inspection Line."** Mostafa's graduation project is a computer-vision quality-inspection cell, so the site borrows that idea. A 3D "inspection core" sits in the hero with a laser band sweeping over it. The portrait gets scanned like a part on a conveyor. Each section reads as one station on the line. The site should feel industrial and precise, with a little warmth from the film photo.

Reference sites: Lusion and Active Theory (shader-driven heroes), Igloo Inc (scroll-linked 3D), Locomotive (editorial type and smooth reveals), Linear (restraint and dark UI). Instagram handle **@mxnasserrr** appears in the nav, the polaroid caption, the contact CTA, the footer, OG `profile:username` and JSON-LD `sameAs`.

---

## 0 · Architecture & user flow
Single-page site with anchor navigation (`index.html` + `main.js` + `assets/`). No build step. Three.js 0.160 and GSAP 3.12.5 load from a CDN.

```
Loader (≤0.4s) → HERO (3D core, name, roles) → 01 About (summary + scanned polaroid + stats)
→ 02 Experience (indexed timeline) → 03 Projects (tilt cards, graduation project featured)
→ 04 Skills (4 clusters + marquee) → 05 Education & Credentials → 06 Contact (email, Instagram, WenshPro)
```
Main flow: the visitor gets a first impression from the hero, gets proof from About and Projects, and is led to two primary CTAs: **Email** and **Follow @mxnasserrr**. Instagram is reachable from every viewport through the fixed nav pill.

## Color palette
| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0A0B0D` | Page background |
| `--ink-2` / `--ink-3` | `#121417` / `#1B1E22` | Cards, chips |
| `--line` | `#2A2E33` | Hairlines, borders |
| `--bone` | `#ECE7DD` | Primary text (warm, matches polaroid paper) |
| `--mute` | `#9AA39E` | Secondary text, mono labels |
| `--signal` | `#FF6A2B` | Brand accent, CTAs (industrial safety orange) |
| `--teal` | `#5FD3C4` | Scanner/laser, focus ring, "machine vision" |
| `--sage` | `#8FA89A` | Arabic name, tertiary (taken from the photo's wall) |

Contrast: bone on ink is 15.9:1, mute on ink is 7.6:1, and signal-ink on signal is about 6.7:1. All pass WCAG AA, and most pass AAA.

## Typography
- **Display:** Syne 700/800, uppercase, tracking −0.035em. Used for the name, H2s and the big email.
- **Body:** Inter Tight 400–600, 17px with 1.6 line-height.
- **Data/labels:** JetBrains Mono 400/500, uppercase with +0.08em tracking. Used for section numbers, the HUD and tags.
- **Arabic:** IBM Plex Sans Arabic 700 for «مصطفى ناصر — ونش», set with `lang="ar" dir="rtl"`.
- Fluid scale uses `clamp()`. H1 runs from 3.2rem to 10.5rem, H2 from 2.2rem to 4.6rem.

---

## 1 · Hero concept & motion graphics
- **Inspection core.** A WebGL icosahedron (detail 56, or 28 on mobile) with a custom `ShaderMaterial`:
  - Vertex: 3D simplex noise displacement plus a mouse-proximity bulge.
  - Fragment: a fresnel rim in teal, orange on the noise peaks, topographic contour lines, and a **Gaussian laser band** that sweeps vertically on a sine wave.
- **Gimbal rings.** Three line rings, one of them dashed orange, counter-rotate around the core. They read as a gear or sensor mount.
- **Dust field.** 1,400 points (500 on mobile) drift slowly with pointer parallax.
- **HUD.** A mono readout ("QC-LINE / UNIT 01 · SCAN 000 · PASS 99.2%"). The scan counter goes up each time the laser passes. It is decorative and `aria-hidden`.
- **Scroll coupling.** As the visitor scrolls out of the hero, the camera dollies back and up, the core tilts, and the noise amplitude settles.
- **Intro.** The name lines rise out of masks, followed by a stagger of the meta text, chips, nav and HUD.

## 2 · 3D interaction ideas
| Type | Implementation |
|---|---|
| Parallax | Pointer moves the core's rotation and the particle field at different rates. Scroll dollies the camera. |
| Shader effects | Noise displacement, fresnel, contour lines and the laser band. **Phase 2:** an RGB-split/film-grain post pass on the polaroid, and a GPGPU particle morph from the core into a gear when scrolling. |
| Micro-interactions | Polaroid: 3D tilt, cursor-following glare, and a scan line plus "SUBJECT · 0.98" detection box on hover (runs once automatically on enter). Cards: perspective tilt, cursor-tracked radial glow, content lifted on Z. Buttons: magnetic pull. Skills: chips lift and fill orange. Experience: an orange underline grows and the outlined index fills. Stats count up. The email gets an animated underline. |
| Ambient | Pulsing "available" dot, scroll-cue drip, a marquee of outline and solid skill names, and an animated conveyor SVG on the graduation project card. |

## 3 · CV → section mapping
| Section | Content |
|---|---|
| Hero | Name, Arabic name and nickname, one-line positioning, role chips |
| 01 About | Professional summary. Stats: 5+ brands, 2 businesses, 2 languages. Polaroid photo. |
| 02 Experience | Media Buyer (Freelance) · Assistant Engineer (Elsewedy Electric) · Founder/Operator (WenshPro, El Alameya Store) |
| 03 Projects | **Featured:** Automated Quality Inspection System. Others: WenshPro (wwwensh.online), El Alameya Store, Digital Consulting (Mostaql/Khamsat), Security Research (B.Tech, Tradeline), Canvas & Python |
| 04 Skills | Engineering & Automation · Programming & Web · Marketing & E-commerce · IT & Hardware |
| 05 Education & Credentials | B.Sc. Mechatronics, Helwan University · Cisco Cybersecurity Certificate · Languages |
| Awards | **No awards were provided in the CV**, so this section is merged with Credentials. The `.edu` grid is ready for award cards as soon as they exist. |
| 06 Contact | mwensh308@gmail.com · Instagram @mxnasserrr · WenshPro |

## 4 · Animation timeline & performance targets
```
t=0.00  Loader bar 20% → 60% (Three.js ready) → 100% (window load)
t=0.25  Loader fades (0.6s)
t=0.30  Canvas fades in (1.6s, expo.out)
t=0.45  H1 line 1 rises (1.2s) · t=0.57 line 2
t=0.75  Kicker → Arabic → tagline (0.8s each, +0.15s stagger)
t=1.10  Chips stagger 60ms · t=1.20 nav · t=1.40 HUD + scroll cue
Scroll  Reveals: 28px rise + fade, 1s expo-out, 80ms stagger mod 3, trigger at 10% inset
Loop    Laser period ≈ 7s · ring speeds 0.15/0.25/0.4 rad/s · marquee 38s
```
| Metric | Target |
|---|---|
| LCP | < 2.0s on 4G (the H1 is the LCP element and is text, not WebGL) |
| CLS | < 0.02 (all images have explicit dimensions) |
| INP | < 150ms |
| JS transferred | ≈ 170 KB gz (three ≈ 150 KB, gsap ≈ 27 KB, app < 5 KB) |
| Frame rate | 60 fps desktop, ≥ 45 fps mid-range Android |
| GPU | One draw call each for core, rings and points. DPR capped at 1.75 (1.5 on mobile). No antialiasing on mobile. |

Runtime guards:
- The render loop pauses when the hero leaves the viewport (IntersectionObserver) or the tab is hidden.
- `dt` is clamped.
- If WebGL is unavailable, a CSS gradient replaces the scene.
- The loader is force-dismissed after 4s.

## 5 · Accessibility & responsive design
- Semantic landmarks: `header/nav/main/section/footer`. Each section is labelled by its H2. There is one H1 and a skip link.
- `prefers-reduced-motion`: one still frame of WebGL, no loop, no tilt, magnetic or marquee effects, instant reveals, no counters.
- A visible `:focus-visible` ring in teal. Every interactive element is a real `<a>`. External links say so in their label.
- All decorative layers (canvas, HUD, marquee, SVG viz, scan and glare) are `aria-hidden`. The portrait has descriptive alt text.
- Pointer effects only run on `(pointer: fine)`. Touch users get the static, fully readable layout.
- Breakpoints:
  - **≤ 720px:** single column, the core moves above the name, HUD and scroll cue are hidden.
  - **≤ 860px:** nav links collapse (the Instagram pill stays), About stacks.
  - **≤ 960px:** project cards go full width.
- Layout uses a 16–56px fluid gutter, `100svh` hero, and `viewport-fit=cover`. There is no horizontal scroll at 390px (verified).
- Content is readable with JavaScript disabled (the `no-js` class skips reveals and the loader).

## 6 · SEO & metadata
- **Title:** "Mostafa Nasser — Mechatronics Engineer & Media Buyer". **Meta description:** 155 characters with the location keyword.
- **Canonical:** `https://wwwensh.online/`. Swap this if the CV lives on a subdomain such as `cv.wwwensh.online`.
- **Open Graph `profile`:** first and last name, `username=mxnasserrr`, a 1200×630 `og-image.jpg`, and the `ar_EG` alternate locale. Twitter `summary_large_image`.
- **JSON-LD `ProfilePage → Person`:**
  - `alternateName` (Wensh, مصطفى ناصر), `alumniOf` Helwan University, `worksFor` WenshPro and El Alameya Store.
  - `hasCredential` Cisco, `knowsAbout`, `knowsLanguage`.
  - `sameAs` Instagram.
- `rel="me"` on Instagram links for identity verification.
- To do at deploy:
  - `robots.txt` and `sitemap.xml`.
  - Add LinkedIn/GitHub to `sameAs` once they exist.
  - An Arabic `/ar/` version with `hreflang`. The Arabic font is already loaded.
- Target queries: "Mostafa Nasser mechatronics", "media buyer Cairo", "PlayStation controller repair Giza", "WenshPro".

## 7 · Asset list & delivery timeline
| Asset | Format | Status |
|---|---|---|
| Portrait | WebP + JPG at 480w and 873w, `srcset`, ~20–77 KB | ✅ Delivered (`assets/`) |
| OG/social card | JPG 1200×630 | ✅ Delivered |
| Favicon / "W" logo mark | Inline SVG | ✅ Delivered |
| Hero core | Procedural GLSL (no model files) | ✅ Delivered |
| Conveyor illustration | Inline SVG | ✅ Delivered |
| Fonts | Google Fonts woff2, `display=swap` | ✅ Linked. Self-host and subset in phase 2. |
| Graduation project media | 3–5 photos (WebP 1600w) + a 10–15s loop (MP4 H.264 + WebM, ≤ 2 MB, muted, poster) | ⏳ Needed from Mostafa |
| WenshPro / El Alameya visuals | Logos (SVG) and 2 screenshots each (WebP) | ⏳ Needed |
| Apple touch icon | PNG 180×180 | ⏳ Phase 2 |
| Optional: real CAD of the inspection cell | glTF/GLB + Draco, ≤ 1.5 MB, KTX2 textures | ⏳ Phase 2 (replaces or orbits the core) |

| Week | Deliverable |
|---|---|
| W1 | ✅ Concept, design system, working one-page build (this repo) |
| W2 | Real project media, copy review, Arabic version, self-hosted fonts |
| W3 | Phase 2 shaders (polaroid post-FX, particle morph), Lighthouse ≥ 95 all categories |
| W4 | Domain/DNS on Spaceship, deploy (Cloudflare Pages/Vercel), analytics, launch post on @mxnasserrr |

---

### Content questions for Mostafa
1. **Dates** for Elsewedy Electric, freelance work and the expected graduation year. The timeline currently shows role types instead of years.
2. **Awards**: any competitions, hackathons or bug bounty acknowledgements to list?
3. The CV line "Marketing, with practical examples in advertising, digital marketing, and channel strategies" looks like an unfinished course or certificate title. What is it?
4. Can the security disclosures to B.Tech and Tradeline be named publicly?
5. Measurable results for media buying (ROAS, spend, CPA) would make the strongest proof point.
6. Is "Alphacode CLI" the correct tool name?

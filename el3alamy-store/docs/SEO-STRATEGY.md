# Programmatic SEO strategy — El3alamy Store

## Opportunity

Buyers of PlayStation hardware search in predictable patterns. We map each pattern to a page template fed by catalog data we control (prices, stock, specs, compatibility, bundles), so every page carries live, store-specific information rather than swapped keywords.

| Playbook | Search pattern (examples) | Template / URL | Data source | Pages at launch |
|---|---|---|---|---|
| Product | “ps5 pro price egypt”, “dualsense cosmic red” | `/products/{slug}` | products + variants + stock + reviews | 18 |
| Category hub (curation) | “ps5 controllers”, “playstation headsets” | `/category/{slug}` | categories (hand-written intro + FAQ) | 6 |
| Persona/compatibility | “ps5 accessories”, “ps4 accessories” | `/compatible/{platform}` | `product_platforms` | 2 |
| Comparisons | “ps5 pro vs ps5 slim”, “dualsense vs dualsense edge”, “pulse elite vs pulse 3d” | `/compare/{a}-vs-{b}` | shared spec rows + prices | ~12 |
| Bundles | “ps5 bundle”, “ps5 starter pack” | `/bundles/{slug}` | bundles + live component prices | 4 |

Subfolders only (no subdomains) so authority consolidates on one domain.

## Quality guardrails (avoiding thin/doorway pages)

- **Comparisons are only generated** inside categories flagged `comparable` (consoles, controllers, audio — where people genuinely compare) and only when both products share ≥ 4 spec rows. “Charging station vs disc drive” is never created.
- Each comparison computes unique content: price delta and %, number and names of differing specs, newer model, platform differences, and “choose X if…” reasons drawn from each product’s distinct highlights. Pairs differing on fewer than 2 specs are `noindex`.
- Reversed URLs (`b-vs-a`) 301 to one canonical order — no duplicates or cannibalisation.
- Filtered and search variants of `/shop` are `noindex, follow`; hubs carry the ranking intent instead.
- Category and platform pages have hand-written intros and buying-guide FAQs; add a paragraph whenever a category gains products.

## Page template standards

- **Title:** `{Primary keyword} — {benefit/intent}` + ` | El3alamy Store` (e.g. “PlayStation 5 Pro vs PlayStation 5 Slim: Specs, Price & Which to Buy”).
- **Meta description:** ≤ 160 chars, includes live “From EGP …” price or the computed difference.
- **H1** = primary keyword; one per page. Breadcrumbs on every indexable page.
- **Schema:** `Product` + `AggregateOffer` (+ `AggregateRating`/`Review` when real reviews exist) on PDPs; `Product`/`Offer` on bundles; `BreadcrumbList` everywhere; `FAQPage` on hubs and comparisons; `ItemList` on listings; `Store` (with `sameAs` → Instagram, TikTok, Facebook) and `WebSite` + `SearchAction` site-wide.

## Internal linking (hub & spoke)

`Home → Category hubs → Products → Comparisons/Bundles`, with cross-links: PDP ⇄ its comparisons, PDP → bundles containing it, PDP → compatible accessories/consoles, hubs → sibling hubs and platform pages, footer → guides. Every URL is also in `/sitemap.xml`, so no page is orphaned.

## Next pages to add (in priority order)

1. **Localised pages** once shipping data exists: “PS5 price in Egypt”, delivery-area pages only if each has real delivery times/fees.
2. **Game-to-accessory guides** (“best headset for Call of Duty on PS5”) — only with genuine testing notes.
3. **Glossary** (“what is PSSR”, “what is PlayStation Link”) linking into PDPs.
4. Arabic translations (`/ar/…` with `hreflang`) — the audience is bilingual.

## Measurement

Search Console by page type (group by URL prefix): indexation rate, impressions, CTR, average position. Watch for “Crawled – currently not indexed” on comparison pages — a sign to enrich or prune. Track revenue per landing-page type in analytics.

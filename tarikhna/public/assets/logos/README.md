# Club logo kit — official files only

Put each club's **official** logo here, named by the club id in `data/clubs.json`:

    assets/logos/ahly.svg      (preferred: SVG)
    assets/logos/zamalek.png   (fallback: transparent PNG, at least 512px)

`tools/build.py` uses the official file automatically when one exists. Otherwise it renders a
clearly labelled temporary monogram, which is **not** the club's logo.

Rules (see DESIGN_BRIEF.md §7):
- Get files from the club's media office or brand portal, and keep written permission on file.
- Never recolor, stretch, rotate, outline, add shadows to, crop, or animate a logo.
- Clear space on every side = 25% of the logo height. Minimum size: 32px digital, 12mm print.
- Show logos on a neutral tile (light #FFFFFF or dark #1B1915), never on photos or busy art.
- One club's logo never touches another's; equal size when shown side by side.

# D12a — Design brief: "Tabellone"

The maintainer asked for a first screen with a strong "wow" on desktop and phone, an innovative but comfortable experience, beautiful colours and effects. A first direction ("Alpenglow": dark dusk hero, glowing dots, glass panels) was rejected on 25/09/2026 as generic, "made with AI": dark theme only, navy and apricot, gradients, no real animation, no theme switch. The maintainer then chose this direction among three proposals.

## Idea

The product answers *"where can I go with the time I have, and still get home?"*. The design borrows from the station: a **departures board** that lists, on mechanical split flaps, the real trips with a way back leaving from Trento in the next hours. Results are **tickets**. Paper, ink and one signal colour, like transport signage and printed timetables.

## Visual language

- **Palette**: paper `#ede9df`, ink `#111111`, signal yellow `#ffc700`; board `#0e0e0e` with flaps `#1c1c1c`. Yellow is used only as a background under ink or outlined in ink (1.3:1 on paper otherwise). Muted text `#56544e` (6.2:1). Dark theme: paper and ink swap, the board stays black.
- **Theme**: light by default, dark following the system, and a visible switch in the header. The choice is a cookie read by the server, so the page is rendered in the right theme from the first byte; the new theme grows as a circle from the button (View Transitions).
- **Type**: Archivo (variable weight and width, OFL) for everything, heavy and condensed for headlines; JetBrains Mono (OFL) for times, labels and data. Self-hosted, Archivo preloaded.
- **Brand**: the mark is one split-flap card, the upper flap with the way there (yellow arrow), the lower with the way back. The wordmark is Archivo black condensed with the flap hinge cut through the letters and a yellow arrow under "Arrivo". The mark flips on hover.
- **Rules**: 1.5 px ink rules, hard offset shadows in ink, small radii. No gradients as decoration, no glass, no stock photos.

## Screens

- **Home**: kinetic headline (letters rise and unsqueeze, the last line wiped with yellow; the headline squeezes away on scroll), search form in an inked box; a yellow ticker with the catalogue destinations; the **departures board** (`/board`: real search from Trento, next hour to ten hours later, rows sorted by departure, each row opens that trip); "How it works"; **"How far you get in 90 minutes"**, a pinned section where scrolling runs the clock from 0 to 90 minutes and the reachable stops (`/bloom`, real one-to-all) appear in order; a giant wordmark.
- **Results**: split view with a paper-style map (ink outbound, yellow return with ink edge) on desktop; on phones the list is a sheet over the map. Cards are tickets: yellow stub with departure and return times, perforation, day ribbon, a stamp for the backup return.
- **Motion**: split flaps (3D, two halves, spinning through the preceding cards), kinetic type, scroll-driven animations (CSS `animation-timeline` where supported, static otherwise), stamp, map fly-to, theme circle. Only transforms and opacity after load: no layout shift. `prefers-reduced-motion` shows final states and no pinning.

## Constraints that stay

- All assets self-hosted (CSP allows only `self`, `data:` images and `blob:`); fonts are never inlined as `data:`.
- Works without JavaScript for search (board, map and scroll section are enhancements); keyboard and screen reader flows (the board rows are links with the whole trip as text); 44 px targets.
- Lighthouse on mobile ≥ 90 for performance on the home page: the board sends no flaps from the server (one CSS element per empty row) and starts spinning only when it enters the viewport.
- Every text in Italian and English. Never invent data: the board and the reach map show only what the engine returned, or say that nothing is available.

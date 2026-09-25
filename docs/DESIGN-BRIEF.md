# D12a — Design brief: "Tabellone"

The maintainer asked for a first screen with a strong "wow" on desktop and phone, an innovative but comfortable experience, beautiful colours and effects. A first direction ("Alpenglow": dark dusk hero, glowing dots, glass panels) was rejected on 25/09/2026 as generic, "made with AI": dark theme only, navy and apricot, gradients, no real animation, no theme switch. The maintainer then chose this direction among three proposals.

## Idea

The product answers *"where can I go with the time I have, and still get home?"*. The design borrows from the station: a **departures board** that lists, on mechanical split flaps, the real trips with a way back leaving from Trento in the next hours. Results are **tickets**. Paper, ink and one signal colour, like transport signage and printed timetables.

## Visual language

- **Palette**: paper `#ede9df`, ink `#111111`, signal yellow `#ffc700`; board `#0e0e0e` with flaps `#1c1c1c`. Yellow is used only as a background under ink or outlined in ink (1.3:1 on paper otherwise). Muted text `#56544e` (6.2:1). Dark theme: paper and ink swap, the board stays black.
- **Theme**: light by default (whatever the system says: the maintainer's choice), dark only with the visible switch in the header. The choice is a cookie read by the server, so the page is rendered in the right theme from the first byte; the new theme grows as a circle from the button (View Transitions).
- **Type**: Archivo (variable weight and width, OFL) for everything, heavy and condensed for headlines; JetBrains Mono (OFL) for times, labels and data. Self-hosted, Archivo preloaded.
- **Brand**: the mark is a "D" drawn as a transit-map route on a yellow tile: the stem is the start, the bowl runs out to a stop (a ring) and comes back with an arrow — a day trip with a way home. The wordmark is heavy slanted Archivo, like railway brands, with "Arrivo" on a yellow band (option D of six shown to the maintainer; a hinge-cut version read as struck-through text, a version with the final "o" as a stop was rejected).
- **Rules**: 1.5 px ink rules, hard offset shadows in ink, small radii. No gradients as decoration, no glass, no stock photos.

## Screens

- **Home**: first screen with the kinetic headline and the search form on the left and the **departures board** on the right (below the form on phones): `/board` runs the real search from Trento for the next hours, rows sorted by departure, each row opens that trip. Then a yellow ticker with the catalogue destinations; "How it works" as **stacked cards** that pile up while scrolling, each with a small scene (typing a place, the day ribbon drawing itself, the backup stamp); **"How far you get in 90 minutes"**, a pinned section where scrolling runs the clock from 0 to 90 minutes: the reachable stops (`/bloom`, real one-to-all) appear in order on a **printed-style map** of Trentino from our basemap (paper, forests a shade darker, lakes and rivers, railways in black and white, town names), starting close on Trento and opening up with time, with a time rail and a "scroll" cue; a giant wordmark.
- **Results**: split view with a paper-style map (ink outbound, yellow return with ink edge) on desktop; on phones the list is a sheet over the map. Cards are tickets: yellow stub with departure and return times, perforation, day ribbon, a stamp for the backup return.
- **Board legibility**: times are per-character flaps; each destination is one wide blade, as on real Solari boards, with the place on the upper half ("RIVA DEL GARDA") and the spot or the kind of destination on the lower one ("ROCCA E LUNGOLAGO"), so names are never cut. Per-character names were tried first and were unreadable (maintainer's review).
- **Motion**: split flaps (3D, two halves, spinning through the preceding cards), kinetic type, scroll-driven animations (CSS `animation-timeline` where supported, static otherwise), stamp, map fly-to, theme circle. Only transforms and opacity after load: no layout shift. `prefers-reduced-motion` shows final states and no pinning.

## Constraints that stay

- All assets self-hosted (CSP allows only `self`, `data:` images and `blob:`); fonts are never inlined as `data:`.
- Works without JavaScript for search (board, map and scroll section are enhancements); keyboard and screen reader flows (the board rows are links with the whole trip as text); 44 px targets.
- Lighthouse on mobile ≥ 90 for performance on the home page: the board sends no flaps from the server (one CSS element per empty row) and starts spinning only when it enters the viewport.
- Every text in Italian and English. Never invent data: the board and the reach map show only what the engine returned, or say that nothing is available.

# D12a — Design brief: "Alpenglow"

The maintainer asked for a first screen with a strong "wow" on desktop and phone, an innovative but comfortable experience, beautiful colours and effects. This brief picks one direction so the work can start; iterate with the maintainer on screenshots.

## Idea

The product answers *"where can I go with the time I have, and still get home?"*. The design makes **time and reach visible**: the first screen is a living map of Trentino where reachable places light up outward from where you are, like the evening glow (alpenglow) spreading over the mountains.

## First screen (hero)

- Full-bleed map with a soft terrain-like look (dark dusk tones), the Trentino valleys readable.
- A real reachability "bloom": dots appear outward from Trento in time order (animated from `/api/v1/reachability`, data-true, never invented). On load it plays once; with `prefers-reduced-motion` it shows the final state.
- Over it, one sentence and one field: "Dove arrivo oggi, e torno in tempo?" + the place picker + a single "Parti" button. Advanced filters stay one tap away.
- Phone: map fills the screen, the search sits in a bottom sheet; results slide up as a draggable sheet.

## Results

- **Day ribbon**: each proposal shows a horizontal timeline of the chosen day (e.g. 08–20) with outbound, stay and return as segments and the backup return as a ghost segment. It explains the core value (the way home) at a glance.
- Cards grouped visually by category (lake, town, castle, nature) with custom line-illustration icons, not stock photos.
- Selecting a card flies the map to the destination and draws both legs (existing geometry), outbound and return in two distinct colours.

## Visual language

- Palette (tokens, light and dark): night blue `#0f1b2d`, glacier teal `#2bb3a3`, alpenglow apricot `#ff9a62`, snow `#f6f4ef`, granite `#5a6472`. Validate data colours with the dataviz checks; text meets WCAG 2.2 AA.
- Type: a characterful display face for headlines and a highly legible text face, both self-hosted under the SIL OFL (e.g. Fraunces or Bricolage Grotesque + Inter). No third-party font CDN.
- Motion: 150–400 ms, eased; map fly-to, card reveal, ribbon draw. Nothing loops; everything respects reduced motion.
- Imagery: SVG illustrations (mountain silhouettes, lake ripples) made for the project. Photos only with recorded free licences (e.g. Wikimedia Commons with attribution).

## Constraints that stay

- All assets self-hosted (CSP allows only `self`, `data:` and `blob:`); no external requests.
- Works without JavaScript for search (the map is enhancement); keyboard and screen reader flows; 44 px targets.
- Lighthouse performance on mobile ≥ 90 on the home page; the map and animation code load lazily.
- Every text in Italian and English.
- Existing unit, E2E and axe tests stay green; add E2E for the ribbon and the phone sheet.

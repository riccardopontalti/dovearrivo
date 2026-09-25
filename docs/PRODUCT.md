# Product and first release

## Promise

A person states where they start, from when they are available and by when they want to be back. DoveArrivo proposes destinations for which a documented combination of outbound journey, stay and return journey exists.

The promise covers scheduled timetables and declared coverage. It does not guarantee punctuality, seat availability or that attractions are open.

## Audience and positioning

Residents, students and visitors without a car. The distinctive value is answering *"where can I go with this time?"*, with the return visible on the card itself.

| Alternative | What it does | How DoveArrivo differs |
| --- | --- | --- |
| Google Maps, Moovit, official operator apps | A → B journeys | Starts from available time, not from a known destination; pairs outbound and return |
| [Zuugle](https://www.zuugle.it) (AGPL) | Hiking tours reachable by public transport, departures from cities incl. Trento, Bolzano, Merano | Any kind of destination; free time window; departure from any stop or place; backup return |
| [Chronotrains](https://www.chronotrains.com/en) | Rail reachability maps | Local buses and rail; concrete itineraries with a return |

Do not copy code or content from AGPL projects into this MIT repository.

First region: Trentino. Initial data: Trentino Trasporti urban and extra-urban feeds; Trenitalia regional rail from the National Access Point (verified in D01). The extra-urban feed contains only one rail line (R35 Trento–Malé–Mezzana); without Trenitalia, Valsugana and Brennero trains are missing. If the Trenitalia feed is unavailable or stale, the UI must state that rail coverage is partial and must not publish destinations whose natural access is a missing rail line.

## Essential flow

1. Choose a starting point (stop, address or place), date, "Leaving from" and "Back by".
2. Set maximum duration per leg, minimum stay, walking and transfers.
3. Browse a list of destinations first; the map is an additional view.
4. Open a proposal and read both itineraries, with the backup return if any.
5. Share the search; the recipient recomputes current timetables.

| Field | Default | v0.1 limit |
| --- | --- | --- |
| Date | Tomorrow, if covered | Today to +30 days, within actual validity |
| Availability | 09:00–19:00 | Same day, 06:00–23:00; window 2–16 hours |
| Duration per leg | 90 minutes | 30–180 minutes |
| Minimum stay | 120 minutes | 30–480 minutes |
| Walking per leg | 20 minutes | 5–30 minutes, conservative estimate |
| Transfers per leg | 1 | 0–2 |

When a larger walking limit would unlock more proposals, say so next to the filter; never raise the limit silently. D01 showed that the Levico lakeside is about 30 minutes on foot from the train station, beyond the 20-minute default.

Duration per leg includes walking and waiting during the journey. It excludes waiting at home before the actual departure and time already spent at home after arrival.

## Experience

Each card shows: name, stay, proposed times, outbound/return duration, walking, transfers and coverage. The detail view adds lines, stops, walk to the entrance and source.

Required messages (Italian and English):
- "Scheduled timetables; check operator notices before leaving."
- "No later return found" when there is no backup.
- "Partial search" when a processing limit is hit.
- "No proposals found with these filters" for a complete empty result.

Mobile single-column layout, desktop list + map. Buttons at least 44 px; keyboard navigation, visible focus, labels and messages readable by screen readers. Target WCAG 2.2 AA, to be verified: do not claim certification.

Languages: Italian and English from the first public release. Visitors without a car are a large share of the audience in Trentino.

## Reachability preview (phase 3)

A map answering *"where can I be by 11:00 leaving after 08:00?"*, computed with MOTIS one-to-all. This semantics is correct for one-to-all (earliest arrival including initial waiting); it is **not** a trip duration filter and never produces proposals. Label it as a preview; curated proposals remain the product. See [ROUTING](ROUTING.md).

## Catalogue and growth

Start with 20 outdoor destinations with verifiable entrances. Editorial candidates: town centres of Pergine, Levico, Borgo, Cles and Mezzano; lakesides at Caldonazzo, Levico, Molveno, Riva and Terlago; Parco Asburgico. They are ideas to verify, not approved entries. Pergine, Levico, Borgo and Caldonazzo depend on the Valsugana rail line: publish them only with rail data, or with a documented bus alternative.

Destinations live in versioned YAML files validated in CI, so adding one is a good first contribution.

Out of scope at first: technical routes, bookings and ticketing. Favourites, geolocation, PWA and new regions follow real use of the pilot.

Initial validation: 10 people complete a search without help; at least 5 take a trip and report problems. These are learning thresholds, not success forecasts.

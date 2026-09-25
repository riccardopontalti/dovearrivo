# Delivery plan

Four phases, about 6 weeks for one person with coding agents and human review. A phase ends when its acceptance criteria pass, not when a date expires. The order is chosen so that a working public demo exists by the end of phase 2.

## Phase 1 — Foundations (week 1)

| Ticket | Work | Done when |
| --- | --- | --- |
| D01 — integrated engine proof | Pinned MOTIS with TT urban, TT extra-urban and Trenitalia (NeTEx); STA optional; OSM walking to a real entrance | Waiting-time case correct; real outbound and return including one bus–train transfer; Trenitalia calendar coverage and licence documented; import memory and query latency measured |
| D02 — project and contracts | SvelteKit, API types from OpenAPI, i18n skeleton, fixtures, CI (check, test, build) | Reproducible install and build; mock API conforms to contract |

D01 decides whether Trenitalia enters the pilot. If the feed is stale, its licence is unclear or memory exceeds the server, record the reason and apply the partial-rail rule in [PRODUCT](PRODUCT.md).

## Phase 2 — Walking skeleton online (weeks 2–3)

| Ticket | Work | Done when |
| --- | --- | --- |
| D03 — routing domain | Pure functions: filters, pairing, backup return, ranking | All cases in routing-cases.json pass as unit tests |
| D04 — MOTIS adapter and search API | `/api/v1/search`, `/stops`, `/destinations`, `/data-status`; timeouts, partial states, simple cache | Contract tests against pinned MOTIS; partial errors visible |
| D05 — minimal UI | Form and result list, Italian UI, stop search | One full flow on phone and desktop, no map |
| D06 — first deployment | VPS, Caddy, Compose, nightly data rebuild, last-known-good rollback, 5 verified destinations | Public demo URL; failed import keeps previous data |

## Phase 3 — Showcase (weeks 4–5)

| Ticket | Work | Done when |
| --- | --- | --- |
| D07 — map and detail | PMTiles basemap, itinerary geometry, detail view, share link | Works with map unavailable; no external tile requests |
| D08 — search by place | MOTIS geocoding; contract extended with a coordinate origin | Place origin respects walking limits; no public Nominatim |
| D09 — English UI | English catalogue, language switch, localised dates | All required messages in both languages |
| D10 — reachability preview | one-to-all map labelled as preview | Never used for proposals; semantics tested |

## Phase 4 — Launch (week 6)

| Ticket | Work | Done when |
| --- | --- | --- |
| D11 — catalogue | About 20 destinations with verified entrances and original descriptions | Every published destination has documented provenance and check |
| D12 — beta and launch | 10 testers, fixes, README with GIF and live link, launch post and technical article | Release criteria below met; known issues visible |

## After launch

Zero-downtime switching between two MOTIS instances, tuned rate limiting, load tests beyond 5 concurrent searches, precomputation, real-time data (STA publishes GTFS-RT), PWA, geolocation, new regions. Redis or a database only after a measured limit.

## Required tests

| Area | Test |
| --- | --- |
| Duration | Available from 08:00, bus at 09:00: the short trip stays eligible |
| Window | Exclude trips returned on previous/next days |
| Return | Destination with outbound only does not appear; minimum stay enforced |
| Backup | Two variants on the same first bus do not count as recovery |
| Walking | Broken path, wrong entrance and sum of WALK segments |
| Calendar | Weekday/holiday, school exception, beyond 24:00 and DST change |
| Multi-feed | Bus–train transfer; same station in two feeds |
| Data | Expired feed, failed download, changed stop identifier |
| Performance | 5 concurrent searches, cold/warm cache, global limit respected |
| Interface | Keyboard, screen reader, 360 px, desktop; map unavailable; both languages |
| Rollback | Faulty new snapshot; consistent return to the previous one |

Unit tests for the logic on fixtures; contract tests on the pinned engine; manual comparison of at least 12 origin/destination/date combinations with official timetables. CI must not depend on live data.

## Commands to implement

The first code must provide: `npm run dev`, `check`, `test`, `test:e2e` and `build`; a documented command to import data; `docker compose up` for the full environment. Today these are the development contract, not commands available in this repository.

## Release criteria

- Both itineraries and the walk to the destination are verified.
- Coverage, scheduled-data notice and partial status are visible; missing rail coverage is stated if applicable.
- No dependency on AI or indispensable commercial APIs.
- Resource limits and costs measured; attributions and operator contact present.
- Restorable snapshot and working data status page.
- English README with Italian README, real demo images, local setup guide and contribution guide.

For launch: a short demo, three reproducible searches and an article on the technical decisions. Measure successful searches and feedback; GitHub stars are a secondary indicator.

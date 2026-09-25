# Delivery plan

Four phases, about 6 weeks for one person with coding agents and human review. A phase ends when its acceptance criteria pass, not when a date expires. The order is chosen so that a working public demo exists by the end of phase 2.

## Phase 1 — Foundations (week 1)

| Ticket | Work | Done when |
| --- | --- | --- |
| D01 — integrated engine proof | Pinned MOTIS with TT urban, TT extra-urban and Trenitalia (NeTEx); STA optional; OSM walking to a real entrance | Waiting-time case correct; real outbound and return including one bus–train transfer; Trenitalia calendar coverage and licence documented; import memory and query latency measured |
| D02 — project and contracts | SvelteKit, API types from OpenAPI, i18n skeleton, fixtures, CI (check, test, build) | Reproducible install and build; mock API conforms to contract |

**D01 status (25/09/2026): done** — see [D01-engine-proof.md](../research/D01-engine-proof.md). Trenitalia is included; its licence is not stated by the publisher and the maintainer accepted that risk on 25/09/2026 (see [DATA](DATA.md)).

**D02 status (25/09/2026): done** — SvelteKit app with pinned dependencies; `npm run gen:api` generates TypeScript types (openapi-typescript) and runtime JSON schemas (Ajv) from the contract; the four endpoints answer from a mock backend over the synthetic fixture; Italian/English message catalogues; CI runs generation drift check, type check, tests and build. The ROUTING constraints and window rules already exist as pure functions with tests for C01, C02, C05, C06 and C08.

**D03 status (25/09/2026): done** — `src/lib/domain`: deduplication, per-leg filters, outbound/return pairing, backup return on a distinct first trip, destination ranking and partial/complete aggregation. Cases C01–C06, C08 and C09 run as unit tests (mapping in `research/routing-cases.json`); mutation checks confirmed the C04 tests catch a broken backup rule. C07, C10 and C11 need the engine or the pipeline and move to D04/D06.

**D04 status (25/09/2026): done** — `src/lib/server/motis`: query builder, client with per-call timeouts, normalisation to contract Journeys, one extra page per direction with truncation detection, global limit of 4 concurrent calls, 12 s search budget, in-memory LRU cache (64 MiB, 15 min) keyed by request, catalogue, data version and engine version. The destination catalogue is YAML validated by `catalogue/destinations.schema.json`; the data status comes from the snapshot manifest (72 h warning, 7 day suspension). CI runs C01, C02, C07 and an unknown-stop check against pinned MOTIS with synthetic fixtures. End-to-end on real data (Trento → Levico test point): 85 ms per search. C10 is covered by the engine itself: without a walking network MOTIS does not route to coordinates, so no straight-line fallback exists; a check with OSM on a verified entrance moves to D11.

**D06a status (25/09/2026): done** — `pipeline/` (TypeScript, run by Node 24 directly): conditional size-limited downloads with retries, GTFS/NeTEx structure and coverage checks, NAP gzip → ZIP, Geofabrik clip with `osmium` (complete ways, zero missing references), MOTIS import, per-dataset metrics, sample searches on a private server, 20% drift review, manifest, atomic promotion, retention of 2 snapshots and rollback. Demonstrated on real data: first build in 12 s with all samples passing; a no-change run records checks without rebuilding; a corrupted TT file is rejected with the active snapshot untouched; rollback restores the previous snapshot. The first run caught two real problems: MOTIS rejects a 16-hour `searchWindow` with `plan_max_search_window_minutes: 960` (now 1440), and Trenitalia stop ids change between feed versions (samples now use coordinates).

D01 decides whether Trenitalia enters the pilot. If the feed is stale, its licence is unclear or memory exceeds the server, record the reason and apply the partial-rail rule in [PRODUCT](PRODUCT.md).

## Phase 2 — Walking skeleton online (weeks 2–3)

| Ticket | Work | Done when |
| --- | --- | --- |
| D03 — routing domain | Pure functions: filters, pairing, backup return, ranking | All cases in routing-cases.json pass as unit tests |
| D04 — MOTIS adapter and search API | `/api/v1/search`, `/stops`, `/destinations`, `/data-status`; timeouts, partial states, simple cache | Contract tests against pinned MOTIS; partial errors visible |
| D05 — minimal UI | Form and result list, Italian UI, stop search | One full flow on phone and desktop, no map |
| D06a — data pipeline | TypeScript job: conditional downloads, checks, OSM clip, MOTIS import, sample searches, promotion, manifest, rollback | New invalid feed never replaces the valid one; C11 passes; rollback demonstrated locally |
| D06b — first deployment | VPS, Caddy, Compose, scheduled pipeline, 5 verified destinations | Public demo URL; failed import keeps previous data |

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
| D12a — public visual design | Distinctive, modern visual identity for desktop and mobile: typography, colour, motion, imagery with recorded licences; applied to search, results, detail and map | Design review on real devices; accessibility and performance targets still met |
| D12 — beta and launch | 10 testers, fixes, README with GIF and live link, launch post and technical article | Release criteria below met; known issues visible |

The phase 2–3 screens are functional; the public look is built once in D12a, after the engine and data work, and before the launch.

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

Available since D02: `npm run dev`, `check`, `test`, `build` and `gen:api`. Since D06a: `npm run data:update` and `npm run data:rollback`. Still to implement: `test:e2e` (D05) and `docker compose up` for the full environment (D06b).

## Release criteria

- Both itineraries and the walk to the destination are verified.
- Coverage, scheduled-data notice and partial status are visible; missing rail coverage is stated if applicable.
- No dependency on AI or indispensable commercial APIs.
- Resource limits and costs measured; attributions and operator contact present.
- Restorable snapshot and working data status page.
- English README with Italian README, real demo images, local setup guide and contribution guide.

For launch: a short demo, three reproducible searches and an article on the technical decisions. Measure successful searches and feedback; GitHub stars are a secondary indicator.

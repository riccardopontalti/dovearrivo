# DoveArrivo

[![CI](https://github.com/riccardopontalti/dovearrivo/actions/workflows/ci.yml/badge.svg)](https://github.com/riccardopontalti/dovearrivo/actions/workflows/ci.yml)

**Car-free day trips with a guaranteed way home.**
Tell it where you start, when you are free and when you must be back: DoveArrivo proposes destinations reachable by public transport, with a complete outbound and return journey — and, when one exists, a later backup return.

🇮🇹 [Leggi in italiano](README.it.md) · 🌐 **Live preview: [dovearrivo.it](https://dovearrivo.it)**

> **Status: public preview.** Real journeys on real timetables for Trentino, Italy. The destinations are still drafts being verified, so the site runs in preview mode (banner, not indexed). Next: a much richer catalogue of destinations and points of interest.

## Why

Journey planners answer *"how do I get from A to B?"*. DoveArrivo answers *"where can I go with the time I have, and still get home?"*

- **Any kind of destination** — towns, lakes, castles, parks, not only hiking trails.
- **Free time window** — "I'm free from 9:00 to 19:00", not a fixed departure.
- **Return first** — a proposal exists only if both legs fit your limits; a backup return on a different first vehicle is shown when available.
- **No pointless trips** — a destination next to where you start is not proposed.
- **Transparent data** — scheduled timetables, visible coverage, sources and dataset version on every result.

Related projects: [Zuugle](https://www.zuugle.it) (hiking tours by public transport, departures from cities including Trento), [Chronotrains](https://www.chronotrains.com/en) (rail reachability maps), [Transitous](https://transitous.org) (community-run MOTIS journey planner).

## What you can do today

- **Search** from a stop, an address or a place, with day, time window, trip length, minimum stay, walking and transfers. Results are ranked "tickets" with a timeline of the day, both itineraries, the backup return and a map of the route. Every search is a shareable link, and works without JavaScript.
- **Departures board** on the home page: real trips with a way back leaving from Trento in the next hours, on split-flap displays; each row opens its trip.
- **How far you get in 90 minutes**: a scroll-driven map where the stops reachable from Trento light up in arrival order.
- **Travel-time map** (`/reachability`): every stop you can reach by a given time from any starting point.
- **Data status** (`/data-status`): sources, licences, dataset version and coverage dates.
- Italian and English, light and dark themes, keyboard and screen reader friendly (automated WCAG 2.2 AA checks, not a certification).

## Key decisions

- Pilot in Trentino: Trentino Trasporti urban and extra-urban GTFS, plus Trenitalia regional rail (Valsugana and Brennero lines) from the Italian National Access Point.
- A curated catalogue of destinations with verified entrances; same-day trips.
- SvelteKit + TypeScript for site, API and data pipeline; [MOTIS](https://github.com/motis-project/motis) for timetable routing, walking and geocoding, on our own server.
- MapLibre with a self-hosted Protomaps PMTiles basemap; fonts and assets served by us; no tracking and no third-party requests.
- Versioned files and in-memory cache: no application database.
- One small VPS; every push to `main` with green CI is deployed automatically.
- No AI model in the running service.

## Roadmap

| Phase | Goal | State |
| --- | --- | --- |
| 1 — Foundations | Engine proof with three data sources; repository, CI | Done |
| 2 — Walking skeleton | Routing logic, MOTIS adapter, result list, data pipeline, deployment | Done |
| 3 — Showcase | Map, sharing, place search, English, reachability preview, visual design | Done, design in review |
| 4 — Content | Many verified destinations and points of interest, with useful information on each | Next |
| 5 — Beta and launch | About 10 testers, fixes, public launch | Planned |

Details in [DELIVERY](docs/DELIVERY.md) and the current state in [STATUS](docs/STATUS.md).

## Documentation

| Document | Purpose |
| --- | --- |
| [Product](docs/PRODUCT.md) | What to build and for whom |
| [Architecture](docs/ARCHITECTURE.md) | Components and responsibilities |
| [Routing](docs/ROUTING.md) | Correct search and return logic |
| [Data](docs/DATA.md) | Sources, coverage and updates |
| [Delivery](docs/DELIVERY.md) | Tickets, tests and release criteria |
| [Status](docs/STATUS.md) | What is done, what waits, what is next |
| [Design brief](docs/DESIGN-BRIEF.md) | Visual design ("Tabellone") and its decisions |
| [Operations](docs/OPERATIONS.md) | Hosting and maintenance |
| [Deploy](docs/DEPLOY.md) | Server setup and automatic deployment |
| [Sources and evidence](docs/SOURCES.md) | Evidence, assumptions and open points |
| [API contract](spec/api.openapi.yaml) | Interface between UI and backend |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |
| [Contributing](CONTRIBUTING.md) | Corrections, destinations and code |

## Progress

| Ticket | Result |
| --- | --- |
| D01 | Engine proof: MOTIS v2.11.3 imports Trentino Trasporti, Trenitalia and OpenStreetMap together in 14 s and answers in under 100 ms ([report](research/D01-engine-proof.md)) |
| D02 | SvelteKit app, types and runtime validation generated from the OpenAPI contract, mock API, CI |
| D03 | Routing domain: outbound/return pairing, backup return on a different first vehicle, ranking, partial results |
| D04 | MOTIS adapter with engine contract tests in CI against the pinned release |
| D05 | Search UI: stop autocomplete, time window and filters, works without JavaScript, end-to-end and accessibility tests |
| D06a | Data pipeline: download, checks, GTFS validator, import, promotion and rollback |
| D06b | Server online; automatic deploy after green CI, preview mode |
| D07 | Self-hosted basemap, itinerary map, sharing |
| D08 | Start from an address or place (self-hosted geocoding), coverage check |
| D09 | Italian and English everywhere, including catalogue and data status |
| D10 | Reachability preview map |
| D11 (prep) | 19 draft destinations from OpenStreetMap with provenance, to be verified |
| D12a | Visual design "Tabellone": departures board, scroll-driven reach map, tickets, themes, brand — in review with the maintainer |

## Local development

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:5173, mock backend with synthetic data
npm test           # unit and contract tests
npm run check      # type checking
npm run build      # production build (adapter-node)
npm run test:e2e   # browser flows (first run: npx playwright install chromium)
npm run gen:api    # regenerate types and schemas after editing spec/api.openapi.yaml
```

The mock backend serves only the synthetic stops "Origine sintetica A" (`syn_A`) and "Destinazione sintetica B". It never returns real timetables.

Engine contract tests (downloads the pinned MOTIS release, verifies its checksum and imports synthetic fixtures):

```bash
npm run engine:fixtures
.engine/bin/motis server -d .engine/data &
npm run test:engine
```

To run against real data (needs `unzip`, `zip`, `osmium` and the MOTIS binary):

```bash
MOTIS_BIN=/path/to/motis npm run data:update
/path/to/motis server -d data/pipeline/active/motis &
DOVEARRIVO_BACKEND=motis DOVEARRIVO_MANIFEST=data/pipeline/active/manifest.json npm run dev
```

The first run downloads about 650 MB of OpenStreetMap data from Geofabrik. Add `DOVEARRIVO_INCLUDE_DRAFTS=true` locally to include draft destinations. The basemap is built by `scripts/basemap.sh`; without it the maps say so and the text stays complete.

## How this project is built

DoveArrivo is designed, reviewed and maintained by [Riccardo Pontalti](https://github.com/riccardopontalti) and developed together with AI coding agents (Claude Code). Product decisions, data checks and acceptance of every ticket are human; agent contributions appear as `Co-Authored-By` in the commits. The rules agents follow are in [AGENTS.md](AGENTS.md), and each ticket closes with what works, how it was verified and what is still missing.

The running service uses no AI model: journeys come from open timetable data and an open source routing engine.

## License

Original code and documentation: [MIT](LICENSE). External data, fonts and components keep their own licences: see [NOTICE](NOTICE.md).

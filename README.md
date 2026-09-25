# DoveArrivo

[![CI](https://github.com/riccardopontalti/dovearrivo/actions/workflows/ci.yml/badge.svg)](https://github.com/riccardopontalti/dovearrivo/actions/workflows/ci.yml)

**Car-free day trips with a guaranteed way home.**
Tell it where you start, when you are free and when you must be back: DoveArrivo proposes destinations reachable by public transport, with a complete outbound and return journey — and, when one exists, a later backup return.

🇮🇹 [Leggi in italiano](README.it.md)

> **Status:** early development. The engine proof is done and the app skeleton runs on a mock backend with synthetic data; real journey search comes with the MOTIS adapter (D04). Pilot region: Trentino, Italy.

## Why

Journey planners answer *"how do I get from A to B?"*. DoveArrivo answers *"where can I go with the time I have, and still get home?"*

- **Any kind of destination** — towns, lakes, parks, not only hiking trails.
- **Free time window** — "I'm free from 9:00 to 19:00", not a fixed departure.
- **Return first** — a proposal exists only if both legs fit your limits; a backup return on a different first vehicle is shown when available.
- **Transparent data** — scheduled timetables, visible coverage, sources and dataset version on every result.

Related projects: [Zuugle](https://www.zuugle.it) (hiking tours by public transport, departures from cities including Trento), [Chronotrains](https://www.chronotrains.com/en) (rail reachability maps), [Transitous](https://transitous.org) (community-run MOTIS journey planner).

## Key decisions

- Pilot in Trentino: Trentino Trasporti urban and extra-urban GTFS, plus Trenitalia regional rail (Valsugana and Brennero lines) from the Italian National Access Point.
- About 20 curated destinations with verified entrances; same-day trips.
- SvelteKit + TypeScript for site, API and data pipeline; [MOTIS](https://github.com/motis-project/motis) for timetable routing, walking and geocoding.
- MapLibre with a self-hosted Protomaps PMTiles basemap; no mandatory commercial API.
- Versioned files and in-memory cache: no application database in v0.1.
- One small VPS, target about 11–15 €/month.
- No AI model in the running service.

## Roadmap

| Phase | Goal | Visible outcome |
| --- | --- | --- |
| 1 — Week 1 | Integrated engine proof with three data sources; repository, CI | Credible public repository |
| 2 — Weeks 2–3 | Routing logic, MOTIS adapter, 5 destinations, result list, deployment | Live demo link |
| 3 — Weeks 4–5 | Map, detail, sharing, place search, English UI, reachability preview | Screenshots and demo GIF |
| 4 — Week 6 | 20 destinations, beta with 10 people, launch | Public launch |

Details in [DELIVERY](docs/DELIVERY.md).

## Documentation

| Document | Purpose |
| --- | --- |
| [Product](docs/PRODUCT.md) | What to build and for whom |
| [Architecture](docs/ARCHITECTURE.md) | Components and responsibilities |
| [Routing](docs/ROUTING.md) | Correct search and return logic |
| [Data](docs/DATA.md) | Sources, coverage and updates |
| [Delivery](docs/DELIVERY.md) | Tickets, tests and release criteria |
| [Operations](docs/OPERATIONS.md) | Hosting and maintenance |
| [Sources and evidence](docs/SOURCES.md) | Evidence, assumptions and open points |
| [API contract](spec/api.openapi.yaml) | Interface between UI and backend |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents |
| [Contributing](CONTRIBUTING.md) | Corrections, destinations and code |

## Progress

- **D01 — engine proof: done.** MOTIS v2.11.3 imports Trentino Trasporti, Trenitalia and OpenStreetMap together in 14 s and answers journey queries in under 100 ms, including bus–train transfers. Details: [D01-engine-proof.md](research/D01-engine-proof.md).
- **D02 — project and contracts: done.** SvelteKit app, types and runtime validation generated from the OpenAPI contract, mock API over the synthetic fixture, Italian/English skeleton, CI.
- **D03 — routing domain: done.** Pure, tested functions choose the outbound/return pair, the backup return on a different first vehicle and the ranking; partial failures stay visible.
- **D04 — MOTIS adapter: done.** Real searches over Trentino Trasporti, Trenitalia and OpenStreetMap answer in under 100 ms locally; engine contract tests run in CI against the pinned MOTIS release.
- **D06a — data pipeline: done.** Downloads, checks, imports, verifies and promotes timetable snapshots with rollback; a corrupted feed never replaces valid data.
- **Next: D05** — minimal search UI (form and results list); then D06b, the first public deployment.

## Local development

Requires Node.js 24 (see `.nvmrc`).

```bash
npm ci
npm run dev        # http://localhost:5173, mock backend with synthetic data
npm test           # unit and contract tests
npm run check      # type checking
npm run build      # production build (adapter-node)
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

The first run downloads about 650 MB of OpenStreetMap data from Geofabrik. Add `DOVEARRIVO_INCLUDE_DRAFTS=true` locally to include draft destinations.

## How this project is built

DoveArrivo is designed, reviewed and maintained by [Riccardo Pontalti](https://github.com/riccardopontalti) and developed together with AI coding agents (Claude Code). Product decisions, data checks and acceptance of every ticket are human; agent contributions appear as `Co-Authored-By` in the commits. The rules agents follow are in [AGENTS.md](AGENTS.md), and each ticket closes with what works, how it was verified and what is still missing.

The running service uses no AI model: journeys come from open timetable data and an open source routing engine.

## License

Original code and documentation: [MIT](LICENSE). External data and components keep their own licences: see [NOTICE](NOTICE.md).

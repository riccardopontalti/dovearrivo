# DoveArrivo

**Car-free day trips with a guaranteed way home.**
Tell it where you start, when you are free and when you must be back: DoveArrivo proposes destinations reachable by public transport, with a complete outbound and return journey — and, when one exists, a later backup return.

🇮🇹 [Leggi in italiano](README.it.md)

> **Status:** pre-development. This repository currently contains specifications, decisions and initial configuration. The application is not implemented yet. Pilot region: Trentino, Italy.

## Why

Journey planners answer *"how do I get from A to B?"*. DoveArrivo answers *"where can I go with the time I have, and still get home?"*

- **Any kind of destination** — towns, lakes, parks, not only hiking trails.
- **Free time window** — "I'm free from 9:00 to 19:00", not a fixed departure.
- **Return first** — a proposal exists only if both legs fit your limits; a backup return on a different first vehicle is shown when available.
- **Transparent data** — scheduled timetables, visible coverage, sources and dataset version on every result.

Related projects: [Zuugle](https://www.zuugle.it) (hiking tours by public transport, departures from cities including Trento), [Chronotrains](https://www.chronotrains.com/en) (rail reachability maps), [Transitous](https://transitous.org) (community-run MOTIS journey planner).

## Key decisions

- Pilot in Trentino: Trentino Trasporti urban and extra-urban GTFS, plus Trenitalia regional rail (Valsugana and Brennero lines) subject to verification in ticket D01.
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

## First step

Ticket **D01** in [DELIVERY](docs/DELIVERY.md): reproduce the timetable cases in [routing-cases.json](research/routing-cases.json), import all feeds together and verify a real journey up to a destination entrance on OpenStreetMap.

## License

Original code and documentation: [MIT](LICENSE). External data and components keep their own licences: see [NOTICE](NOTICE.md).

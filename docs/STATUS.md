# Project status and handoff

Last updated: 25/09/2026. Read this after README and AGENTS.md when picking up the work in a new session.

## Done

| Ticket | Result |
| --- | --- |
| D01 | Engine proof: MOTIS 2.11.3 with TT urban, TT extra-urban, Trenitalia NeTEx and a Geofabrik OSM clip ([D01-engine-proof.md](../research/D01-engine-proof.md)) |
| D02 | SvelteKit app, contract-generated types and runtime schemas, mock backend, CI |
| D03 | Routing domain: pairing, backup return on a distinct first trip, ranking, partial results |
| D04 | MOTIS adapter, catalogue, manifest, cache, limits; engine contract tests in CI |
| D05 | Search UI (URL-backed, works without JS), E2E and axe checks |
| D06a | Data pipeline with checks, GTFS validator, promotion and rollback |
| D06b prep | `deploy/` (Docker, Compose, Caddy, systemd timer) and [DEPLOY.md](DEPLOY.md); images built in CI |
| D07 | Self-hosted basemap (Protomaps PMTiles), itinerary map, sharing |
| D08 | Start from an address or place (MOTIS geocoding), coverage check |
| D09 | Italian/English everywhere, including catalogue and data status |
| D10 | Reachability preview map (`/reachability`) |
| D11 prep | 19 draft destinations from OSM with provenance ([D11-candidates.md](../research/D11-candidates.md)) |

## Waiting for the maintainer

- **Server**: OVHcloud VPS-1, Ubuntu 24.04. Deployment is automatic through GitHub Actions once the maintainer adds the `DEPLOY_HOST` and `DEPLOY_SSH_KEY` repository secrets and points the DNS A records to the server ([DEPLOY.md](DEPLOY.md)). It runs in preview mode (drafts visible, banner, noindex) so the maintainer can browse every change. Never ask for a private key in a chat or commit one.
- **Destination verification**: entrances and access of the drafts (checklist in D11-candidates.md). Only then `status: published`.

## Next

1. **D12a — visual design** from [DESIGN-BRIEF.md](DESIGN-BRIEF.md). Work against the mock backend (`npm run dev`) and, for real data, the engine fixtures; keep every existing test green and extend E2E/axe to the new screens.
2. **D06b — deploy** once the server exists.
3. **D11 — publish** verified destinations.
4. **D12 — beta** with about 10 people, then launch (README GIF, live link, article).

## Things that bit us (keep them in mind)

- MOTIS 2.11.3 sends HTTP/1.1 bodies delimited by connection close; Node's `fetch` (undici) crashed the process under load. The MOTIS client uses `node:http` on purpose.
- `plan_max_search_window_minutes` must exceed 960 (a 16-hour window is rejected at exactly 960); the pipeline sets 1440. One-to-all is limited to 90 min unless `onetoall_max_travel_minutes` is raised (240).
- The openstreetmap.fr Trentino extract has missing node references and breaks MOTIS imports; use Geofabrik Nord-Est clipped with `osmium --strategy complete_ways`.
- Trenitalia stop ids change between feed versions; samples use coordinates.
- SvelteKit reruns a `load` only for URL parameters it reads: read `lang` via `localeFromUrl(url)` in each load.
- All E2E traffic comes from one IP: `playwright.config.ts` raises the rate limits through env variables.
- `data/`, `.engine/` and the basemap are never committed; scripts rebuild them (`npm run data:update`, `scripts/basemap.sh`, `npm run engine:fixtures`).
- `deploy/bootstrap.sh` reaches the server on stdin (`ssh … bash -s`). A command that reads stdin (`docker compose run` without `-T`) swallowed the rest of the script, so the first deploy reported success without starting the stack. The script is now wrapped in `main()`, jobs run with `-T < /dev/null`, and the deploy fails unless the app answers.

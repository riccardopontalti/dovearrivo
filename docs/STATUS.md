# Project status

**Concluded on 25/09/2026 as a v0.1 pilot. Not in active development.** The technical goals were met; after using the site the maintainer judged the demand too narrow to justify verifying content and launching. This file records the final state for anyone who reads or resumes the project.

## Done

| Ticket | Result |
| --- | --- |
| D01 | Engine proof: MOTIS 2.11.3 with TT urban, TT extra-urban, Trenitalia NeTEx and a Geofabrik OSM clip ([D01-engine-proof.md](../research/D01-engine-proof.md)) |
| D02 | SvelteKit app, contract-generated types and runtime schemas, mock backend, CI |
| D03 | Routing domain: pairing, backup return on a distinct first trip, ranking, partial results |
| D04 | MOTIS adapter, catalogue, manifest, cache, limits; engine contract tests in CI |
| D05 | Search UI (URL-backed, works without JS), E2E and axe checks |
| D06a | Data pipeline with checks, GTFS validator, promotion and rollback |
| D07 | Self-hosted basemap (Protomaps PMTiles), itinerary map, sharing |
| D08 | Start from an address or place (MOTIS geocoding), coverage check |
| D09 | Italian/English everywhere, including catalogue and data status |
| D10 | Reachability preview map (`/reachability`) |
| D11 prep | 19 draft destinations from OSM with provenance ([D11-candidates.md](../research/D11-candidates.md)) |
| D06b | `deploy/` (Docker, Compose, Caddy, systemd timer), images built in CI; server online in preview mode at https://dovearrivo.it, deployed from `main` after green CI ([DEPLOY.md](DEPLOY.md)) |
| Routing fix | Destinations less than 3 km from the start are not proposed ("you are already there"), see ROUTING.md |
| D12a | "Tabellone" design, final (a first "Alpenglow" version was rejected): departures board from `/board`, reach map scrubbed by scroll from `/bloom`, kinetic headline, tickets, theme switch, new brand; see [DESIGN-BRIEF.md](DESIGN-BRIEF.md) |

Final verification (25/09/2026, latest `main`): `npm run check` clean; 136 unit tests, 30 end-to-end tests (2 skipped by design) and 4 engine contract tests passing; CI and deploy green.

## Not done

- **D11** — the 19 destinations are drafts with OpenStreetMap points; none was verified or published ([D11-candidates.md](../research/D11-candidates.md)).
- **D12** — beta with users and public launch.
- Privacy page, operator contact and THIRD_PARTY_NOTICES (required before a real launch).
- Written confirmation of Trenitalia's reuse terms (the National Access Point states no licence).
- Load and memory measurements on the production VPS; walking hint; real-time data.

## Running service

- https://dovearrivo.it runs on an OVHcloud VPS-1 in **preview mode** (draft destinations, banner, `noindex`), deployed from `main` after green CI ([DEPLOY.md](DEPLOY.md)). The data pipeline is scheduled every 6 hours by a systemd timer.
- Left unattended, it keeps working while the sources publish valid files. The Trenitalia file in use is valid until 12/12/2026: if the National Access Point does not publish the next timetable, coverage shrinks and the data status turns `unavailable` after that date (TT feeds run to June 2027).
- To stop the service: `sudo docker compose down` in `/srv/dovearrivo/deploy`, `sudo systemctl disable --now dovearrivo-update.timer`, and remove the `DEPLOY_HOST` / `DEPLOY_SSH_KEY` secrets so pushes no longer deploy.

## If the project resumes

1. Verify and publish a first set of destinations (checklist in D11-candidates.md), then switch `PREVIEW` to `false`.
2. Add the privacy page and operator contact; compile THIRD_PARTY_NOTICES.
3. Measure the production VPS; run a small beta.

## Things that bit us (keep them in mind)

- MOTIS 2.11.3 sends HTTP/1.1 bodies delimited by connection close; Node's `fetch` (undici) crashed the process under load. The MOTIS client uses `node:http` on purpose.
- `plan_max_search_window_minutes` must exceed 960 (a 16-hour window is rejected at exactly 960); the pipeline sets 1440. One-to-all is limited to 90 min unless `onetoall_max_travel_minutes` is raised (240).
- The openstreetmap.fr Trentino extract has missing node references and breaks MOTIS imports; use Geofabrik Nord-Est clipped with `osmium --strategy complete_ways`.
- Trenitalia stop ids change between feed versions; samples use coordinates.
- SvelteKit reruns a `load` only for URL parameters it reads: read `lang` via `localeFromUrl(url)` in each load.
- All E2E traffic comes from one IP: `playwright.config.ts` raises the rate limits through env variables.
- `data/`, `.engine/` and the basemap are never committed; scripts rebuild them (`npm run data:update`, `scripts/basemap.sh`, `npm run engine:fixtures`).
- `deploy/bootstrap.sh` reaches the server on stdin (`ssh … bash -s`). A command that reads stdin (`docker compose run` without `-T`) swallowed the rest of the script, so the first deploy reported success without starting the stack. The script is now wrapped in `main()`, jobs run with `-T < /dev/null`, and the deploy fails unless the app answers.

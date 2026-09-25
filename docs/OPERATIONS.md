# Hosting and maintenance

## Server and cost

Options checked on 25/09/2026 (monthly, excluding VAT): OVHcloud VPS-1 (2 vCore, 4 GB, 3.81 €) and VPS-2 (4 vCore, 8 GB, 7.21 €), same provider as the domain; Hetzner CX23 (5.49 €), CAX11 (5.99 €), CX33 (8.49 €), CAX21 (10.49 €), IPv4 extra. Serving needs well under 1 GB (MOTIS about 110 MB plus 336 MB of mapped data, the app about 100 MB); the nightly import peaked at 1.75 GB RSS in D01, so 4 GB with swap should suffice but must be measured on Linux in D06b. One server hosts Caddy, the application, MOTIS and the static basemap; the import job runs separately from the processes serving users.

Target: about 11–15 €/month for hosting including VAT, IPv4 and a small backup, plus about 11 €/year to renew the `dovearrivo.it` domain. It is an estimate, not a quote. D01 measured the full import (TT + Trenitalia + OSM clip + geocoding) at 14 s and a peak footprint of 3.9 GB, with the server at about 110 MB plus mapped data: 8 GiB is comfortable. Confirm on the target server in D06.

No GPU requirement. No inference cost.

## Consistent updates (v0.1)

Each snapshot includes the MOTIS index, OSM data, catalogue, stops and manifest. A search always uses a single snapshot.

v0.1 uses a short declared maintenance window at night:
1. The pipeline builds the new snapshot in `data/pipeline/snapshots/` while the current one serves traffic.
2. It runs the checks from [DATA](DATA.md), including sample searches on a private MOTIS instance.
3. On success it switches the `active` symlink atomically and runs `PROMOTE_HOOK`, which restarts MOTIS on `active/motis` (a few seconds of 503 with `Retry-After`). The app re-reads `active/manifest.json` on each request.
4. If the new snapshot misbehaves in production, `npm run data:rollback` restores the previous one; run the hook again.

Schedule: every 6 hours (feeds are checked; the snapshot is rebuilt only on a new local day or a changed source).

Do not just swap a symlink while a process keeps reading an old memory map. Zero-downtime switching with two MOTIS instances comes after launch, if memory allows.

A snapshot change invalidates the cache. Keep at least two snapshots; keep large files and binaries out of Git. Backups include manifest, catalogue and configuration; verify restoring a data snapshot.

Version basemap asset URLs and their HTTP cache when the PMTiles file changes. A browser left open on an old version must be able to reload current state without keeping incompatible tiles.

## Essential protections

- Public ports only 80/443; protected admin access; MOTIS on a private network.
- Input validated by schema, bounded strings, time budgets, at most 4 simultaneous MOTIS calls globally.
- Simple per-IP rate limit at the proxy and a global search queue of at most 10; reject excess with 429 and `Retry-After`. Tune after launch.
- The client cancels superseded searches; cache hits avoid new work.
- Origins and destinations come from the catalogue or from our geocoder. No user-controllable upstream URL, file upload or generic proxy.
- Downloads only from expected domains; size and decompression limits; no ZIP extraction with arbitrary paths.
- Security headers and a CSP compatible with MapLibre workers; local assets; pinned and audited dependencies.
- Never expose MOTIS internals or debug fields.

Configure SvelteKit `ORIGIN` and proxy headers correctly: trust only the proxy actually managed.

## Privacy and measurement

No accounts, advertising profiling or GPS position in v0.1. The server receives the chosen origin to compute the search.

Do not log search bodies, full shared URLs or itineraries associated with IPs. Prefer logs of status, duration, error code and data snapshot. Keep technical logs for 7 days; aggregate counters without personal identifiers to measure searches, errors and timings.

Rate limiting may keep IPs in memory with short expiry; never build a movement archive. The privacy page still describes server logs and the actual operator.

## Failures

| Event | Response |
| --- | --- |
| Download failed | Keep valid data, alert the operator |
| Feed out of validity | Disable uncovered dates |
| One MOTIS search fails | Partial result, never an invented itinerary |
| MOTIS unavailable | Readable 503 and invitation to retry |
| Maintenance window | Readable 503 with `Retry-After` |
| Map unavailable | List and textual detail remain usable |
| Faulty new snapshot | Restore the previous one entirely |

Monitor: errors/timeouts, age of last check, available horizon, RAM, disk, import duration, cache hits and p95 latency. Operational metrics are visible only to the operator.

The PWA comes later: any offline copy must show date and version, without implying timetables are current.

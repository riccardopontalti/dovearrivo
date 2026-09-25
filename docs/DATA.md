# Data, coverage and updates

## Sources

Configuration lives in [sources.yaml](../config/sources.yaml). Use fixed download URLs, never scrape websites on user requests.

| Source | Status | Observed content |
| --- | --- | --- |
| TT extra-urban (GTFS) | Verified 24/09/2026 | 2,861 stops, 120 routes, 3,085 trips in the file |
| TT urban (GTFS) | Verified 24/09/2026 | 1,113 stops, 44 routes, 3,715 trips in the file |
| Trenitalia (NeTEx) | Candidate, D01 | National regional/intercity rail from the Italian National Access Point; acquisition through the Transitous preprocessor; mirror last modified 27/05/2026 |
| STA South Tyrol (GTFS) | Optional, D01 | CC0 per Open Data Hub; also publishes GTFS-RT |
| OSM Trentino-Alto Adige (PBF) | Downloaded, not imported | 135,748,929 bytes |
| Protomaps basemap (PMTiles) | Planned, D07 | Regional extract of the daily build |

Stop counts do not add up to unique places. Trips in the file are not trips per day.

Extra-urban: 119 routes with `route_type=3` and R35 with `route_type=2`. Urban: 43 routes with `route_type=3` and one with `route_type=5`. Show the services actually imported; never infer full regional coverage from a dataset name.

`feed_info` observed: extra-urban 10/09/2026–25/06/2027; urban 10/09/2026–08/06/2027. The website shows different dates: for planning, calendars, exceptions and imported data count, not the page description.

### Trenitalia specifics

- The feed is national. Importing it whole is simplest; filtering to a bounding box saves memory but may cut through-trains. D01 measures memory with the full feed first.
- The primary source is the National Access Point; the Transitous preprocessor output is a community mirror. Record which one is used, its update date and the licence stated by the primary source. If the licence cannot be confirmed, the feed stays out.
- Transitous applies a MOTIS Lua script (`it-trenitalia.lua`) to this feed. Review it before reuse; copy only with its licence and attribution.
- Check calendar coverage: a mirror updated months ago may not cover the next 30 days.

## Identity and models

Separate MOTIS prefixes: `tte`, `ttu`, `trenitalia`, `sta`. Never collapse equal `stop_id` or `trip_id` values across sources. The UI may group similar names but keeps physical stops and actual identifiers.

| Model | Minimum fields |
| --- | --- |
| Destination | stable id, names (it/en), category, short original descriptions (it/en), entrance lat/lon, info URL, status draft/published |
| Destination check | checkedAt, checker, coordinate source, accessNotes, exclusion reason if any |
| FeedSnapshot | id, sourceUrl, sha256, fetchedAt, checkedAt, feedVersion, service dates and coverage |
| DatasetSnapshot | id, MOTIS/OSM/catalogue versions, feed hashes, imported interval, check results |
| Stop | MOTIS id, name, coordinates, source feed, public code if any |

Original editorial files are kept separate from OSM-derived extracts. Any OSM-derived dataset keeps ODbL obligations: the MIT licence of the software does not replace them.

## Pipeline

Written in TypeScript and run by a scheduled job, separate from the processes serving users.

1. Check the feeds every 6 hours with conditional requests where supported. Download only when needed; bounded timeouts and retries.
2. Store hash, version and date. `checkedAt` is the last successful check, not the timetable update date.
3. Verify ZIP, CSV, keys and relations. Run the GTFS validator; record warnings too.
4. Nightly: build a new snapshot — calendars, indexes and MOTIS import — covering yesterday to today + 30 days, both inclusive: 32 days.
5. Run sample searches and compare with the active snapshot.
6. Promote the whole snapshot; keep the previous one for rollback.

OSM: weekly check, rebuild only after a change. Use the full regional extract in the first implementation; a tight crop can break walks. Destinations are limited to the imported walking coverage. The same extract feeds MOTIS geocoding.

Rebuild the timetable window every day even if GTFS content has not changed. Reuse compatible geographic artefacts according to the pinned MOTIS release: do not re-download OSM when only the date advances.

Catalogue updates happen through pull requests on YAML files validated in CI. No public form for arbitrary coordinates or text in v0.1.

## Quality rules

Block a new snapshot if the import failed, data are empty, dates are unusable or sample itineraries are broken. The validator may report errors already present in the source: allow only documented waivers, with precise scope and a test, never blanket ignores.

A change above 20% in stops/trips requires review before promotion; it is not automatically a defect, e.g. during a seasonal change.

A failed update never removes the last valid snapshot. After 72 hours without a successful check show a warning; after 7 days suspend new searches, per the initial project policy. A source unchanged but successfully rechecked is not "stale".

Block days outside the actual available interval. School calendars, holidays and `calendar_dates` must affect results. Absence of trips on a covered day is not automatically a technical error.

## Licences and attribution

The current TT page states CC BY 2.5 Italy; the Dati Trentino catalogue also lists CC BY 4.0 metadata. Keep both pieces of evidence and attribute the files according to the operator's direct statement, never relabelled as MIT.

OpenStreetMap: ODbL, visible attribution on the map and on the Sources page. Basemap style, fonts, icons and photographs have their own licences; avoid photographs in the first release.

Publish `/sources` and `/data-status` pages (localised) with included services, exclusions, last check, validity, versions and links to the originals.

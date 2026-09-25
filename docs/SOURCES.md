# Sources, evidence and open points

Documentation revised on **25 September 2026** after a pre-development review. File observations and MOTIS tests below were performed on 24 September 2026. An architecture review is not an acceptance test of the complete site.

## Primary sources

| Source | Supported decision |
| --- | --- |
| [Trentino Trasporti — Open data](https://www.trentinotrasporti.it/it/opendata-it) | Urban/extra-urban feeds and attribution |
| [Dati Trentino — urban](https://dati.trentino.it/en/dataset/trasporti-pubblici-del-trentino-formato-gtfs/resource/57869023-adfa-467e-8100-76403257d2d1) | File URL and catalogue metadata |
| [Dati Trentino — extra-urban](https://dati.trentino.it/en/dataset/trasporti-pubblici-del-trentino-formato-gtfs/resource/0b1db5d6-8d2b-4f06-97f2-f65d605dfeda) | Official file URL |
| [Italian National Access Point](https://www.cciss.it/nap/mmtis/public/static/multimodal) | Primary source of Trenitalia NeTEx timetables |
| [Transitous Italian feeds](https://github.com/public-transport/transitous/blob/main/feeds/it.json) | Proven configuration for Trenitalia NeTEx and STA in MOTIS |
| [Transitous Trenitalia preprocessor](https://github.com/public-transport/transitous-trenitalia-preprocessor) | Community conversion of the Trenitalia NeTEx feed |
| [Open Data Hub — STA datasets](https://github.com/noi-techpark/opendatahub-gtfs-api) | STA South Tyrol GTFS and its CC0 licence |
| [MOTIS](https://github.com/motis-project/motis) / [v2.11.3 release](https://github.com/motis-project/motis/releases/tag/v2.11.3) | Engine, amd64/arm64 builds; latest release on 25/09/2026 |
| [MOTIS v2.11.3 API](https://raw.githubusercontent.com/motis-project/motis/v2.11.3/openapi.yaml) | Adapter parameters, types and units |
| [MOTIS v2.11.3 setup](https://raw.githubusercontent.com/motis-project/motis/v2.11.3/docs/setup.md) | Import, transfers and limits |
| [GTFS Schedule](https://gtfs.org/documentation/schedule/reference/) | Calendars, exceptions and service times |
| [MobilityData validator](https://github.com/MobilityData/gtfs-validator) | Structural feed checks |
| [Geofabrik Italy Nord-Est](https://download.geofabrik.de/europe/italy/nord-est.html) / [osmium-tool](https://osmcode.org/osmium-tool/) | OSM source and regional clip (the OSM France extract failed D01) |
| [Regione Liguria — Trenitalia dataset](https://dati.regione.liguria.it/dataset/ds-637) | Precedent: regional Trenitalia subset under CC BY 4.0 |
| [OSM licence](https://www.openstreetmap.org/copyright) | Attribution and derived data |
| [Protomaps basemaps](https://docs.protomaps.com/) / [OpenFreeMap](https://openfreemap.org/) | Self-hosted basemap; hosted fallback |
| [Tile policy](https://operations.osmfoundation.org/policies/tiles/) / [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) / [Transitous API policy](https://transitous.org/api/) | Avoid improper dependence on public services |
| [SvelteKit adapter-node](https://svelte.dev/docs/kit/adapter-node) / [Node releases](https://nodejs.org/en/about/previous-releases) | Node server application |
| [MapLibre](https://maplibre.org/maplibre-gl-js/docs/) | Map rendering in the browser |
| [Caddy](https://caddyserver.com/docs/automatic-https) / [Compose](https://docs.docker.com/compose/) | HTTPS and single-server operations |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility target |
| [Hetzner price adjustment, June 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) | Cost order of magnitude, not a quote |

Related products: [Zuugle](https://www.zuugle.it) ([source, AGPL](https://github.com/bahnzumberg/zuugle-suchseite)), [Chronotrains](https://www.chronotrains.com/en), [NaturTrip](https://www.naturtrip.travel/en/home). They are not technical dependencies.

## Evidence

- Both TT GTFS feeds downloaded and read; counts, versions and hashes in [verification.json](../research/verification.json).
- Extra-urban import completed in MOTIS v2.11.3; one-to-all searches run in both directions.
- Synthetic waiting case reproduced: one-to-all misses a short trip, plan in profile mode returns it.
- Results outside the requested day observed: hence the independent time filter.
- Regional OSM extract downloaded; size and hash recorded.
- Pre-development review (25/09/2026): Transitous configures Trenitalia NeTEx and STA GTFS for MOTIS; the Trenitalia mirror responded with last modification 27/05/2026; Zuugle lists Trento, Bolzano and Merano as departure cities.
- Domain `dovearrivo.it` purchased by the maintainer on 25/09/2026.

- D01 (25/09/2026): full import with TT, Trenitalia and OSM on MOTIS v2.11.3; real outbound and return with bus–train transfers; synthetic C01/C02 reproduced. Details in [D01-engine-proof.md](../research/D01-engine-proof.md).

The fixture [synthetic-gtfs.zip](../research/synthetic-gtfs.zip) rebuilds the synthetic inputs of the test; expected results are in [routing-cases.json](../research/routing-cases.json). The synthetic experiment was reproduced in D01.

## Still to verify

| Point | How it closes |
| --- | --- |
| Walk to a real, verified entrance | D11, on-site check |
| Trenitalia licence | Written answer from NAP or Trenitalia |
| Weekday and holiday dates; station shared by two feeds | Extend the D01 checks in D04 contract tests |
| Map with local style and fonts | D07, no requests to demo servers |
| Walking parameters and margin applied together | Transfer fixture + walking comparison |
| Memory, import and latency on the VPS | D06; measured on a laptop in D01 |
| Destination and entrance quality | D11, on-site review |
| Operator contact and privacy page | Before public launch |

This review does not establish that the project is unique or will succeed. It establishes a credible technical base and the checks needed to publish it correctly.

# D01 — Integrated engine proof

Run on 25/09/2026 on a MacBook (arm64, 8 GiB RAM) with the official MOTIS v2.11.3 `macos-arm64` build. Inputs were downloaded the same day into the git-ignored `data/` folder. All times below are Europe/Rome local time unless marked `Z`.

## Result

| Criterion | Outcome |
| --- | --- |
| Waiting-time case (C01/C02) | ✅ Reproduced on the synthetic fixture: same itineraries as `verification.json`, including trips on the previous and next day |
| Real outbound and return | ✅ Trento Autostaz. Dante ↔ Levico Terme (Viale Lido), Saturday 26/09 |
| Bus–train transfer | ✅ Bus B423 Levico → Pergine + train Pergine → Trento; train Levico → Povo + bus B402 |
| Trenitalia NeTEx import | ✅ Loaded directly by MOTIS from the ZIP, no script needed |
| Trenitalia licence | ❌ Not stated by the primary source; see below |
| Import memory and time | ✅ 14.3 s, max RSS 1.75 GB, peak footprint 3.93 GB |
| Query latency | ✅ 24–97 ms per `/api/v6/plan` call |
| Geocoding | ✅ Stops of all three datasets, OSM places and addresses |

**Decision:** Trenitalia is technically ready and stays enabled for local development. It stays out of the public deployment until its licence is confirmed. Until then the partial-rail rule in [PRODUCT](../docs/PRODUCT.md) applies.

## Inputs

| Input | SHA-256 | Notes |
| --- | --- | --- |
| MOTIS `motis-macos-arm64.tar.bz2` v2.11.3 | `c626683b52cc808a401a0b31a929523014ed4839b2ae72c700fcfefcd74e5baa` | Official release asset |
| TT extra-urban GTFS | `9459d067792da0160a1a8ed14b1ae4becf8651234b9b9656aa1ee280d594b468` | Same as 24/09 |
| TT urban GTFS | `ef2c19b213781797723eae375300e8ce5f57364c085932e14d9485df795d3093` | Same as 24/09 |
| Trenitalia NeTEx (Transitous mirror) | `499865a80c349500899ad9178c9443432cf8fb8351d31eb311f961b164688ae0` | One 388 MB XML; PublicationTimestamp 2026-05-21; valid 2026-05-23 → 2026-12-12; 14 Lines, 21,126 ServiceJourneys; includes Levico, Pergine, Caldonazzo, Borgo Valsugana, Rovereto, Bolzano |
| OSM Trentino-Alto Adige (openstreetmap.fr) | `5f774bd70ea1dc6856067bc63d05547a8ef57feca94da5d8dd2f6c16e7b6bc67` | **Unusable:** 10,305 way node references missing (`osmium check-refs`); MOTIS fails with `unable to import: invalid location` |
| OSM Italy Nord-Est (Geofabrik) | `2feb4e4bbb1ac1bfa7c239331b925cda8741dfdc7bd7814a0f578c7716f88e7c` | 623,907,525 bytes, last modified 25/09/2026 |
| Regional clip of the above | — | `osmium extract --strategy complete_ways --bbox 10.38,45.66,12.49,47.10`; 198,562,800 bytes; 0 missing references |

The Transitous preprocessor only downloads NAP asset 1080596 (`IT-IT-TRENITALIA_L1.xml.gz`) and repacks it as ZIP. The pipeline can therefore fetch the primary source directly. The mirror had not been refreshed since 27/05/2026.

## Real journey observations

Test destination: the OSM address point "Viale Lido", Levico Terme (46.0103715, 11.2896984). **It is a test coordinate, not a verified entrance.** Parameters as in [ROUTING](../docs/ROUTING.md): availability 09:00–19:00, 90 min per leg, 1 transfer, `searchWindow` 36,000 s.

- **Outbound, 20 min walking:** 14 itineraries, mostly bus B401 (for example 10:35 → 11:31, 56 min including 17 min walking). No Trento → Levico departure between 09:00 and 10:35 on that Saturday.
- **Return, 20 min walking:** buses only. The last return reaches Trento at 14:58, because the afternoon B401 buses from Levico mostly run to Borgo or Feltre. The Levico train station is about 30 minutes on foot from the test point, above the limit.
- **Return, 30 min walking:** 21 itineraries. Trains appear: REG Levico → Trento every hour, 47 minutes on board, with the last arrival at Trento Autostaz. Dante at 18:08. Mixed options include train Levico → Povo, 10 minutes walking, then bus B402.
- The engine also returned itineraries that start before T0 (for example a return starting at 07:56). This confirms that the post-response time filter is required on real data too.

Product consequence: the choice of entrance and the default walking limit decide whether rail is usable. The UI should say when a larger walking limit would unlock more proposals. It must not silently raise the limit.

## Resources

- Import of TT + TT urban + Trenitalia + OSM clip, with geocoding: 14.3 s wall time, max RSS 1.75 GB, peak memory footprint 3.93 GB. The data directory is 336 MB.
- Server after queries: physical footprint 107 MB, plus memory-mapped data.
- An 8 GiB VPS is comfortable. 4 GiB is probably enough to serve but tight for the import: measure on the target server in D06.

## Trenitalia licence

- The NAP asset and dataset pages show no licence or terms of use.
- Regione Liguria publishes its Trenitalia subset under CC BY 4.0 ([ds-637](https://dati.regione.liguria.it/dataset/ds-637)); Toscana publishes a Trenitalia GTFS subset through its own open data portal. No equivalent Trentino dataset was found on Dati Trentino (only station locations, CC0).
- Action: ask the NAP operator (CCISS / Ministry) and Trenitalia for the reuse terms of asset 1080596. Record the answer in [NOTICE](../NOTICE.md) and `config/sources.yaml`.

## Remaining limits

- The walk to a real, verified entrance is not tested yet (D11 catalogue work).
- One weekday and one holiday date still need the same check (Saturday only so far).
- A station served by two feeds (e.g. Trento FS in TT and Trenitalia) was not checked for implausible transfer times.
- The import was not measured on the target Linux VPS.

## Reproduce

```bash
brew install osmium-tool
osmium extract --strategy complete_ways --bbox 10.38,45.66,12.49,47.10 nord-est-latest.osm.pbf -o trentino-aa.osm.pbf
motis import -c config.yml -d motisdata
motis server -d motisdata
```

`config.yml` follows [motis.example.yml](../config/motis.example.yml) with the `trenitalia` dataset enabled and local paths. The query helper used for the observations is [d01_plan_probe.py](d01_plan_probe.py).

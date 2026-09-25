# Attributions and third-party material

The MIT licence covers DoveArrivo's original code and documentation, including the synthetic fixture created for this project. It does not change the licences of external data or components.

- **Trentino Trasporti S.p.A.** — timetable and stop data. Operator's direct statement: [CC BY 2.5 Italy](https://creativecommons.org/licenses/by/2.5/it/), [source page](https://www.trentinotrasporti.it/it/opendata-it). Diverging metadata in the federated catalogue are noted in [DATA](docs/DATA.md).
- **Trenitalia S.p.A.** — rail timetables published on the [Italian National Access Point](https://www.cciss.it/nap/mmtis/public/static/multimodal) (asset 1080596). The publisher states no licence; DoveArrivo attributes the source and will remove the data on request.
- **STA — Südtiroler Transportstrukturen AG** — optional South Tyrol timetables, CC0 per Open Data Hub; to be confirmed in D01 if imported.
- **OpenStreetMap contributors** — geographic data under [ODbL](https://www.openstreetmap.org/copyright). Keep attribution visible and respect obligations for derived extracts and databases.
- **Protomaps** — basemap: a regional extract of the Protomaps daily build (OpenStreetMap data, ODbL) produced by `scripts/basemap.sh`; style layers from `@protomaps/basemaps` (BSD-3-Clause); fonts Noto Sans from `protomaps/basemaps-assets` (SIL Open Font License, `OFL.txt` shipped with the fonts); sprites from the same repository, derived from MIT-licensed tangrams/icons. Attribution on the map: "© OpenStreetMap contributors · Protomaps".
- **Archivo** (The Archivo Project Authors) and **JetBrains Mono** (The JetBrains Mono Project Authors) — interface fonts under the [SIL Open Font License 1.1](https://openfontlicense.org), bundled from the `@fontsource-variable` packages and served by our server; licence texts ship with the site under `/licenses/`.
- **MapLibre GL JS** (BSD-3-Clause) and **PMTiles** (BSD-3-Clause) — map rendering in the browser.
- **MOTIS and dependencies** — distribute their licences and notices when distributing binaries or container images.
- **Transitous** — if any preprocessing script or mirror is reused, keep its licence and attribution.

The repository does not include real TT/Trenitalia/OSM datasets or third-party binaries. Destination descriptions must be original; linking to an information source does not permit copying its photographs or text.

Before release, compile THIRD_PARTY_NOTICES from the components actually distributed, without attributing ownership of the sources to DoveArrivo.

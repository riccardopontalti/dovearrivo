# D11 — Destination candidates (preparation)

Prepared on 25/09/2026. All 19 entries in [catalogue/destinations.yaml](../catalogue/destinations.yaml) are **drafts**: their points come from the local OpenStreetMap extract (entrance or gate nodes, square address points, or place nodes) and nothing has been checked on site or with the operator. Publishing requires the checklist below.

## Reachability from Trento. Autostaz. Dante

Real data (snapshot of 25/09/2026: TT urban, TT extra-urban, Trenitalia), window 08:00–20:00. Defaults: 90 min per leg, 2 h minimum stay, 20 min walking, 1 transfer. *Relaxed: 150 min per leg, 30 min walking, 2 transfers. Times are local.

| Destination | Tue 29/09, defaults | Sat 26/09, defaults | Sat 26/09, relaxed* |
|---|---|---|---|
| Levico Terme – Parco Asburgico | 10:35→11:31, back 13:33, stay 2h02 | 10:35→11:31, back 13:38, stay 2h07, backup | 09:00→10:13, back 16:52, stay 6h39, backup |
| Levico Terme – lungolago | 10:35→11:31, back 13:32, stay 2h01 | 10:35→11:31, back 13:37, stay 2h06, backup | 10:35→11:31, back 14:04, stay 2h33, backup |
| Lago di Caldonazzo – lido | no proposal | no proposal | 09:00→10:04, back 16:59, stay 6h55, backup |
| Pergine Valsugana – centro storico | 09:00→09:44, back 18:49, stay 9h05, backup | 09:00→09:44, back 17:33, stay 7h49, backup | 09:00→09:44, back 17:33, stay 7h49, backup |
| Borgo Valsugana – centro storico | 09:00→10:15, back 16:51, stay 6h36, backup | 09:00→10:15, back 16:51, stay 6h36, backup | 09:00→10:15, back 16:51, stay 6h36, backup |
| Riva del Garda – Rocca e lungolago | 08:05→09:23, back 18:17, stay 8h54, backup | 08:05→09:23, back 18:17, stay 8h54, backup | 08:05→09:23, back 18:17, stay 8h54, backup |
| Arco – castello | 08:15→09:21, back 17:38, stay 8h17, backup | 08:15→09:21, back 17:38, stay 8h17, backup | 08:15→09:21, back 17:38, stay 8h17, backup |
| Torbole – lungolago | no proposal | no proposal | no proposal |
| Lago di Molveno – lido | 08:00→09:17, back 17:34, stay 8h17 | no proposal | 08:00→09:17, back 14:49, stay 5h32, backup |
| Castel Toblino | 08:18→08:49, back 18:33, stay 9h44, backup | 08:18→08:49, back 18:33, stay 9h44, backup | 08:18→08:49, back 18:33, stay 9h44, backup |
| Rovereto – Campana dei Caduti | 09:32→10:20, back 15:40, stay 5h20, backup | 09:14→10:20, back 12:23, stay 2h03 | 08:05→09:01, back 18:31, stay 9h30, backup |
| Cascate del Varone | no proposal | no proposal | 08:15→10:10, back 17:04, stay 6h54, backup |
| Lago di Ledro – palafitte | no proposal | no proposal | 10:15→12:16, back 16:45, stay 4h29 |
| Castel Beseno | no proposal | no proposal | 08:10→09:05, back 17:25, stay 8h20, backup |
| Mezzano – borgo | no proposal | no proposal | no proposal |
| Cles – Piazza Granda | 08:03→09:30, back 17:54, stay 8h24, backup | 08:02→09:30, back 15:47, stay 6h17, backup | 08:02→09:30, back 17:00, stay 7h30, backup |
| Cavalese – centro | 10:50→12:02, back 14:22, stay 2h20 | 10:50→12:02, back 14:22, stay 2h20 | 08:27→09:59, back 16:56, stay 6h57, backup |
| Canazei – centro | no proposal | no proposal | no proposal |
| Monte Bondone – Vason | 12:40→13:33, back 16:42, stay 3h09, backup | 12:40→13:33, back 16:42, stay 3h09, backup | 12:40→13:33, back 16:42, stay 3h09, backup |

Reading the table:
- **Strong candidates** (proposals with defaults on both days, most with a backup return): Pergine, Borgo Valsugana, Riva del Garda, Arco, Castel Toblino, Rovereto, Cles, Levico (park and lakeside).
- **Borderline**: Molveno and Cavalese (weekday or late start only), Monte Bondone (midday only).
- **Need relaxed filters**: Caldonazzo, Cascate del Varone, Ledro, Castel Beseno — their points may be too far from a stop for 20 minutes of walking; check the entrance before relaxing the default.
- **No proposal in any profile**: Torbole, Mezzano, Canazei. Check the point first (Torbole's address point may be far from the stop); Mezzano and Canazei are probably beyond 2.5 hours per leg from Trento.

## Checklist to publish an entry

For each destination, the maintainer (or a contributor) confirms and records in `check`:
1. **Entrance**: the point is a public entrance or a public space where the visit starts (not the centroid of a lake, park or building). Move it if needed and write the new source in `coordinateSource`.
2. **Access**: free or paid, seasonal closures, steps or steep paths. Put facts in `accessNotes` (it/en); do not state opening hours or prices.
3. **Walk from the stop**: open the itinerary map on the local site and check that the walking segment follows a real path to that point.
4. **Description**: short, original, factual (it/en); no copied text or photos.
5. **Info link**: an official page (municipality, park, museum) instead of the OpenStreetMap link, when one exists.
6. Set `checkedAt`, `checkedBy` (name or handle), remove `exclusionReason`, and change `status` to `published`.

Ticketed places (Campana dei Caduti, Cascate del Varone, Castel Beseno, Ledro museum, lidos) need an access note that they may be paid; the service must not state prices.

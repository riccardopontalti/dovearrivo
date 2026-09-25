# Search, constraints and return

## Semantics to preserve

T0 is the instant from which the user can leave; T1 is the instant by which they want to be back at the starting point. Both are instants with an offset, interpreted in Europe/Rome.

For an outbound journey O and a return journey R:
- O.start >= T0; R.end <= T1.
- O.end + minimumStay <= R.start.
- O.duration and R.duration <= maxDurationPerLeg.
- Each leg respects maximum walking and maximum transfers.
- Both contain at least one public transport segment.
- The outbound journey ends at the destination entrance and the return starts from that entrance.
- All instants belong to the selected day.

Duration and stay are computed on the actual instants of the itineraries. Use seconds internally, minutes in the UI. Do not round before checking constraints.

When the origin is a place rather than a stop (phase 3), the walk from the place to the first stop and from the last stop back to the place is part of the leg and counts toward walking and duration.

## Mistake to avoid: duration versus initial waiting

Test reproduced on MOTIS v2.11.3: availability 08:00–18:00, bus 09:00–09:30 and return 15:00–15:30, maximum 60 minutes per leg.

A one-to-all search limited to 60 minutes finds the destination in neither direction: time anchors include waiting that is not part of the journey duration. The plan search with `timetableView=true` returns the itineraries.

Therefore **never use the intersection of two one-to-all searches limited to the per-leg duration as the definitive filter**. The earlier experiment with 173 stops proved the engine works, not that trips are complete.

## v0.1 procedure

1. Validate parameters, day and coverage; take an immutable reference to the active snapshot.
2. Select the published destinations in the catalogue, at most 24.
3. For each destination request two profiles from `/api/v6/plan`: outbound from the origin to the entrance coordinates, return in the opposite direction.
4. Normalise, deduplicate and filter every itinerary against the constraints.
5. Build pairs with sufficient stay. Choose the proposal and the backup return, if any.
6. Rank and respond with data snapshot, warnings and search status.

| MOTIS parameter | Initial value |
| --- | --- |
| timetableView | true |
| time / arriveBy, outbound | T0 / false |
| time / arriveBy, return | T1 / true |
| searchWindow | T1 − T0, in seconds |
| maxTravelTime | User limit, in minutes |
| maxTransfers | User limit |
| transitModes | TRANSIT |
| directModes | Empty array, serialised as `directModes=` |
| preTransitModes, postTransitModes | WALK |
| pedestrianProfile / pedestrianSpeed | FOOT / 1.2 metres per second |
| maxPreTransitTime, maxPostTransitTime | User walking limit, in seconds |
| additionalTransferTime | 2 minutes |
| numItineraries / maxItineraries | 1 / 64 |
| timeout | 2 seconds |

The adapter owns units and serialisation: WALK is a mode; FOOT is a profile.

**Always filter after the response.** In the synthetic case the engine also returned trips from the previous/next day. No result reaches the UI without passing the explicit constraints.

Walking parameters limit single access/egress segments; also check the sum of the WALK segments of the leg. Walking durations may include transfer margins: in v0.1 use a conservative estimate, explained in the filter help. Do not derive distances from speed.

## Destinations you are already at

A destination whose entrance is less than 3 km in a straight line from the starting point is not proposed: from Pergine station, "Pergine Valsugana – centro storico" is a walk, not a day trip by public transport. With a point origin the destination is not even sent to the engine; with a stop origin the check uses the start of the outbound journey. The destination still counts as evaluated, so the search stays complete. Code: `src/lib/domain/nearby.ts`.

## Multiple feeds and rail

TT urban, TT extra-urban and Trenitalia are imported as separate datasets with separate prefixes (`tte`, `ttu`, `trenitalia`). Stops are not merged across sources (`merge_dupes_inter_src: false`); bus–train transfers at stations rely on MOTIS footpaths computed on OSM. D01 must verify at least one real bus–train transfer (e.g. at Trento or Pergine station) and that a station served by both feeds does not produce implausible transfer times.

## Pages, deadlines and completeness

If the itinerary limit is reached, use the next opaque cursor for the outbound journey or the previous one for the return, keeping the original parameters. At most one extra page per direction in v0.1; stop earlier if the global budget is exceeded.

Do not parse cursor text and do not depend on `debugOutput`. Deduplicate by itinerary identifier or by a signature of trips, stops and instants.

An error on one destination does not cancel the others. Timeouts, truncation or unprocessed destinations produce `status=partial`. The UI shows this state even when the result is empty. If no destination can be processed because of a technical failure, return 503; a correctly processed catalogue without proposals returns 200.

`status=complete` means the catalogue was processed without detected errors or truncation; **it does not certify enumeration of every possible route**. The promise is a selection of compatible itineraries. No message may state "impossible to get there" based only on the absence of results.

## Reachability preview

one-to-all answers *"where can I be by time T, leaving the origin not before T0?"*: earliest arrival including initial waiting. This is exactly the semantics of the phase 3 reachability map, and it is correct for that purpose. It must never feed proposals, filter destinations or suggest that a return exists. `/api/v1/one-to-many` in MOTIS is street routing only: it is not a public transport matrix.

## Choosing the return

For each destination:
1. First consider pairs that also allow a later return by T1.
2. The backup must leave the destination later and use a distinct first trip; two variants on the same first bus are not two recovery options.
3. Among those pairs, maximise stay; then minimise total duration, transfers and walking.
4. If no pair has a backup, choose the valid pair with the longest stay and show "No later return found".

Ranking of destinations: backup available, stay descending, total duration, transfers, walking, identifier. Explain the criterion under "Recommended". A backup found in the timetable does not guarantee recovery in case of delays.

## Details that cause bugs

- GTFS may use times beyond 24:00 and previous service days: let the engine interpret them, then apply the instants of the user's day.
- Keep time zone and offset; never add hours to a date as a string.
- Use MOTIS transfers; a line name change without getting off is not necessarily a transfer.
- Decode geometries with the declared `precision`, without assuming 5 decimals. GeoJSON uses longitude, latitude.
- Never replace a missing walking path with a straight-line distance.
- A central coordinate of a lake or building is not a valid entrance.
- Destinations with unverified access restrictions stay in draft.
- Shared links save the search, not an itinerary considered valid forever.

Initial regression cases: [routing-cases.json](../research/routing-cases.json).

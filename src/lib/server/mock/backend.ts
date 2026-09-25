// Mock backend over the synthetic fixture in research/synthetic-gtfs.zip: stops A and B,
// trips A 09:00 → B 09:30, A 10:00 → B 10:20 and B 15:00 → A 15:30, repeated every day.
// It exists so the UI and the contract can be developed before the MOTIS adapter (D04).
// It never returns real timetables.
import type {
	DataStatus,
	Destination,
	Journey,
	NormalizedSearchRequest,
	Place,
	PlaceMatch,
	SearchResponse,
	Stop
} from '$lib/api/types';
import { insideBbox, originOf, type Bbox } from '$lib/domain/origin';
import { summarize } from '$lib/domain/outcome';
import { chooseProposal } from '$lib/domain/pairing';
import { addDays, formatInstant, localDate, localToMillis } from '$lib/domain/time';
import type { Backend } from '../backend';
import { ApiError } from '../errors';

const REPO = 'https://github.com/riccardopontalti/dovearrivo';
const DATA_VERSION = 'mock-synthetic-fixture';
const COVERAGE_DAYS = 30;
/** Area around the synthetic stops; points outside behave like an uncovered region. */
const COVERAGE_BBOX: Bbox = [10.9, 45.9, 11.3, 46.3];

const STOPS: Stop[] = [
	{ id: 'syn_A', name: 'Origine sintetica A', point: { lat: 46.0, lon: 11.0 }, feedId: 'syn' },
	{ id: 'syn_B', name: 'Destinazione sintetica B', point: { lat: 46.2, lon: 11.2 }, feedId: 'syn' }
];

const DESTINATIONS: Destination[] = [
	{
		id: 'synthetic-b',
		name: 'Destinazione sintetica B',
		category: 'test',
		entrance: { lat: 46.2, lon: 11.2 },
		description: 'Synthetic destination from the test fixture. It is not a real place.',
		infoUrl: `${REPO}/blob/main/research/routing-cases.json`,
		checkedAt: '2026-09-25'
	}
];

interface FixtureTrip {
	id: string;
	from: Stop;
	to: Stop;
	departure: string;
	arrival: string;
	headsign: string;
}

const [A, B] = STOPS;
const OUTBOUND_TRIPS: FixtureTrip[] = [
	{ id: 'OUT09', from: A, to: B, departure: '09:00', arrival: '09:30', headsign: 'B' },
	{ id: 'OUT10', from: A, to: B, departure: '10:00', arrival: '10:20', headsign: 'B' }
];
const INBOUND_TRIPS: FixtureTrip[] = [
	{ id: 'BACK15', from: B, to: A, departure: '15:00', arrival: '15:30', headsign: 'A' }
];

function place(stop: Stop): Place {
	return { name: stop.name, point: stop.point, stopId: stop.id };
}

function journey(trip: FixtureTrip, date: string): Journey {
	const start = localToMillis(date, trip.departure);
	const end = localToMillis(date, trip.arrival);
	const startTime = formatInstant(start);
	const endTime = formatInstant(end);
	const durationSeconds = (end - start) / 1000;
	return {
		startTime,
		endTime,
		durationSeconds,
		walkingBudgetSeconds: 0,
		transfers: 0,
		legs: [
			{
				mode: 'BUS',
				from: place(trip.from),
				to: place(trip.to),
				startTime,
				endTime,
				durationSeconds,
				routeName: 'S1',
				headsign: trip.headsign,
				tripId: `${trip.id}@${date}`
			}
		]
	};
}

function matchStops(query: string): Stop[] {
	const q = query.trim().toLocaleLowerCase('it');
	return STOPS.filter((s) => s.name.toLocaleLowerCase('it').includes(q)).slice(0, 20);
}

export function createMockBackend(now: () => number = Date.now): Backend {
	function coverage() {
		const from = localDate(now());
		return { from, to: addDays(from, COVERAGE_DAYS) };
	}

	return {
		async findStops(query) {
			return matchStops(query);
		},

		async findPlaces(query) {
			return matchStops(query).map(
				(s): PlaceMatch => ({ kind: 'stop', name: s.name, point: s.point, stopId: s.id, feedId: s.feedId })
			);
		},

		async listDestinations() {
			return DESTINATIONS;
		},

		async search(request: NormalizedSearchRequest): Promise<SearchResponse> {
			const origin = originOf(request);
			if (origin.kind === 'point' && !insideBbox(origin.point, COVERAGE_BBOX)) {
				throw new ApiError(422, 'ORIGIN_NOT_COVERED', 'The starting point is outside the covered area');
			}
			// The mock has no walking network: only stop A, or a point exactly on it, can start a trip.
			const atA =
				origin.kind === 'stop'
					? origin.stopId === A.id
					: origin.point.lat === A.point.lat && origin.point.lon === A.point.lon;
			if (origin.kind === 'stop' && !atA) {
				throw new ApiError(422, 'UNKNOWN_ORIGIN', 'The origin stop is not in the active data');
			}
			const date = localDate(request.departAfter);
			const { from, to } = coverage();
			if (date < from || date > to) {
				throw new ApiError(422, 'DATE_NOT_COVERED', `Timetables are available from ${from} to ${to}`);
			}

			const proposal = atA
				? chooseProposal(
						DESTINATIONS[0].id,
						OUTBOUND_TRIPS.map((t) => journey(t, date)),
						INBOUND_TRIPS.map((t) => journey(t, date)),
						request
					)
				: null;
			const summary = summarize([
				{ destinationId: DESTINATIONS[0].id, kind: 'evaluated', proposal }
			]);

			return {
				status: summary.status,
				dataVersion: DATA_VERSION,
				generatedAt: formatInstant(now()),
				normalizedRequest: request,
				catalogCount: summary.catalogCount,
				evaluatedCount: summary.evaluatedCount,
				warnings: summary.warnings,
				proposals: summary.proposals
			};
		},

		async dataStatus(): Promise<DataStatus> {
			const { from, to } = coverage();
			return {
				status: 'warning',
				dataVersion: DATA_VERSION,
				timezone: 'Europe/Rome',
				availableFrom: from,
				availableTo: to,
				sources: [
					{
						id: 'syn',
						publisher: 'DoveArrivo synthetic fixture',
						checkedAt: null,
						sourceUrl: `${REPO}/blob/main/research/synthetic-gtfs.zip`,
						licenseUrl: `${REPO}/blob/main/LICENSE`
					}
				],
				limitations: [
					'Mock backend: synthetic fixture only, no real timetables.',
					'The synthetic daily pattern is repeated on every covered date.'
				]
			};
		}
	};
}

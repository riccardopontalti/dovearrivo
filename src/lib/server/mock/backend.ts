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
	Proposal,
	SearchResponse,
	Stop
} from '$lib/api/types';
import { journeyViolations, pairViolations, staySeconds } from '$lib/domain/constraints';
import { addDays, formatInstant, localDate, localToMillis, toMillis } from '$lib/domain/time';
import type { Backend } from '../backend';
import { ApiError } from '../errors';

const REPO = 'https://github.com/riccardopontalti/dovearrivo';
const DATA_VERSION = 'mock-synthetic-fixture';
const COVERAGE_DAYS = 30;

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

function firstTripId(j: Journey): string | undefined {
	return j.legs.find((leg) => leg.mode !== 'WALK')?.tripId;
}

export function createMockBackend(now: () => number = Date.now): Backend {
	function coverage() {
		const from = localDate(now());
		return { from, to: addDays(from, COVERAGE_DAYS) };
	}

	return {
		async findStops(query) {
			const q = query.trim().toLocaleLowerCase('it');
			return STOPS.filter((s) => s.name.toLocaleLowerCase('it').includes(q)).slice(0, 20);
		},

		async listDestinations() {
			return DESTINATIONS;
		},

		async search(request: NormalizedSearchRequest): Promise<SearchResponse> {
			if (request.originStopId !== A.id) {
				throw new ApiError(422, 'UNKNOWN_ORIGIN', 'The origin stop is not in the active data');
			}
			const date = localDate(request.departAfter);
			const { from, to } = coverage();
			if (date < from || date > to) {
				throw new ApiError(422, 'DATE_NOT_COVERED', `Timetables are available from ${from} to ${to}`);
			}

			const outbound = OUTBOUND_TRIPS.map((t) => journey(t, date)).filter(
				(j) => journeyViolations(j, request).length === 0
			);
			const inbound = INBOUND_TRIPS.map((t) => journey(t, date)).filter(
				(j) => journeyViolations(j, request).length === 0
			);
			const pairs = outbound
				.flatMap((o) => inbound.map((i) => ({ o, i })))
				.filter(({ o, i }) => pairViolations(o, i, request).length === 0)
				.sort((a, b) => staySeconds(b.o, b.i) - staySeconds(a.o, a.i));

			const proposals: Proposal[] = [];
			const best = pairs[0];
			if (best) {
				const backup = inbound.find(
					(i) =>
						toMillis(i.startTime) > toMillis(best.i.startTime) &&
						firstTripId(i) !== firstTripId(best.i) &&
						pairViolations(best.o, i, request).length === 0
				);
				proposals.push({
					destinationId: DESTINATIONS[0].id,
					outbound: best.o,
					inbound: best.i,
					...(backup ? { backupInbound: backup } : {}),
					staySeconds: staySeconds(best.o, best.i),
					returnStatus: backup ? 'later_option_found' : 'no_later_option_found'
				});
			}

			return {
				status: 'complete',
				dataVersion: DATA_VERSION,
				generatedAt: formatInstant(now()),
				normalizedRequest: request,
				catalogCount: DESTINATIONS.length,
				evaluatedCount: DESTINATIONS.length,
				warnings: [],
				proposals
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

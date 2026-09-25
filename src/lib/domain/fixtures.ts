// Builders for synthetic journeys used by tests. Times are Europe/Rome local.
import type { Journey, Leg, NormalizedSearchRequest } from '$lib/api/types';
import { formatInstant, localToMillis } from './time';

const point = { lat: 46, lon: 11 };

export function leg(mode: string, date: string, start: string, end: string, tripId?: string): Leg {
	const s = localToMillis(date, start);
	const e = localToMillis(date, end);
	return {
		mode,
		from: { name: 'from', point },
		to: { name: 'to', point },
		startTime: formatInstant(s),
		endTime: formatInstant(e),
		durationSeconds: (e - s) / 1000,
		...(tripId ? { tripId } : {})
	};
}

export function journeyOf(legs: Leg[], transfers = 0): Journey {
	const walking = legs
		.filter((l) => l.mode === 'WALK')
		.reduce((sum, l) => sum + l.durationSeconds, 0);
	const start = legs[0].startTime;
	const end = legs[legs.length - 1].endTime;
	return {
		startTime: start,
		endTime: end,
		durationSeconds: (Date.parse(end) - Date.parse(start)) / 1000,
		walkingBudgetSeconds: walking,
		transfers,
		legs
	};
}

export function request(overrides: Partial<NormalizedSearchRequest> = {}): NormalizedSearchRequest {
	return {
		originStopId: 'syn_A',
		departAfter: '2026-09-26T08:00:00+02:00',
		returnBy: '2026-09-26T18:00:00+02:00',
		maxJourneyMinutes: 90,
		minStayMinutes: 120,
		maxWalkMinutes: 20,
		maxTransfers: 1,
		...overrides
	};
}

// Scriptable MotisClient for unit tests.
import type { GeocodeMatch, MotisClient } from './client';
import type { MotisItinerary, MotisPlanResponse } from './normalize';

export type PlanHandler = (query: URLSearchParams) => MotisPlanResponse | Promise<MotisPlanResponse>;

export function fakeClient(plan: PlanHandler, geocode: GeocodeMatch[] = []) {
	const calls: URLSearchParams[] = [];
	const client: MotisClient = {
		async plan(query) {
			calls.push(query);
			return plan(query);
		},
		async geocode() {
			return geocode;
		}
	};
	return { client, calls };
}

/** One-leg bus itinerary between two local times on 2026-09-26 (Europe/Rome, +02:00). */
export function busItinerary(start: string, end: string, tripId: string): MotisItinerary {
	const s = `2026-09-26T${start}:00+02:00`;
	const e = `2026-09-26T${end}:00+02:00`;
	const place = { name: 'stop', lat: 46, lon: 11, stopId: 'tte_1' };
	return {
		startTime: s,
		endTime: e,
		transfers: 0,
		legs: [{ mode: 'BUS', from: place, to: place, startTime: s, endTime: e, tripId }]
	};
}

// Builds /api/v6/plan query strings with the parameters of docs/ROUTING.md.
// The adapter owns units and serialisation: WALK is a mode, FOOT is a profile.
import type { NormalizedSearchRequest } from '$lib/api/types';
import { toMillis } from '$lib/domain/time';

export const MAX_ITINERARIES = 64;
export const CALL_TIMEOUT_SECONDS = 2;
const PEDESTRIAN_SPEED = 1.2;
const ADDITIONAL_TRANSFER_MINUTES = 2;

export type Direction = 'outbound' | 'inbound';

/** MOTIS place: a stop id or "lat,lon". */
export type MotisPlace = string;

export function coordinatePlace(point: { lat: number; lon: number }): MotisPlace {
	return `${point.lat},${point.lon}`;
}

export function planQuery(
	direction: Direction,
	from: MotisPlace,
	to: MotisPlace,
	request: NormalizedSearchRequest,
	pageCursor?: string
): URLSearchParams {
	const windowSeconds = (toMillis(request.returnBy) - toMillis(request.departAfter)) / 1000;
	const walkSeconds = String(request.maxWalkMinutes * 60);
	const q = new URLSearchParams({
		fromPlace: from,
		toPlace: to,
		time: direction === 'outbound' ? request.departAfter : request.returnBy,
		arriveBy: String(direction === 'inbound'),
		timetableView: 'true',
		searchWindow: String(windowSeconds),
		maxTravelTime: String(request.maxJourneyMinutes),
		maxTransfers: String(request.maxTransfers),
		transitModes: 'TRANSIT',
		directModes: '',
		preTransitModes: 'WALK',
		postTransitModes: 'WALK',
		pedestrianProfile: 'FOOT',
		pedestrianSpeed: String(PEDESTRIAN_SPEED),
		maxPreTransitTime: walkSeconds,
		maxPostTransitTime: walkSeconds,
		additionalTransferTime: String(ADDITIONAL_TRANSFER_MINUTES),
		numItineraries: '1',
		maxItineraries: String(MAX_ITINERARIES),
		timeout: String(CALL_TIMEOUT_SECONDS)
	});
	if (pageCursor) q.set('pageCursor', pageCursor);
	return q;
}

// Converts MOTIS v2.11 plan itineraries into contract Journeys. Only the fields the
// product uses are read; debug output and cursors are never exposed.
import type { Journey, Leg, Place } from '$lib/api/types';
import { formatInstant, toMillis } from '$lib/domain/time';

export interface MotisPlace {
	name: string;
	lat: number;
	lon: number;
	stopId?: string;
}

export interface MotisLeg {
	mode: string;
	from: MotisPlace;
	to: MotisPlace;
	startTime: string;
	endTime: string;
	routeShortName?: string;
	displayName?: string;
	headsign?: string;
	tripId?: string;
	legGeometry?: { points: string; precision: number };
}

export interface MotisItinerary {
	id?: string;
	startTime: string;
	endTime: string;
	transfers: number;
	legs: MotisLeg[];
}

export interface MotisPlanResponse {
	itineraries: MotisItinerary[];
	previousPageCursor?: string;
	nextPageCursor?: string;
}

/** Names that replace MOTIS placeholders for coordinate origins and destinations. */
export interface EndpointNames {
	start: string;
	end: string;
}

function place(p: MotisPlace, names: EndpointNames): Place {
	const name = p.name === 'START' ? names.start : p.name === 'END' ? names.end : p.name;
	return {
		name,
		point: { lat: p.lat, lon: p.lon },
		...(p.stopId ? { stopId: p.stopId } : {})
	};
}

function seconds(start: string, end: string): number {
	return (toMillis(end) - toMillis(start)) / 1000;
}

function leg(l: MotisLeg, names: EndpointNames): Leg {
	const routeName = l.routeShortName || l.displayName;
	return {
		mode: l.mode,
		from: place(l.from, names),
		to: place(l.to, names),
		startTime: formatInstant(toMillis(l.startTime)),
		endTime: formatInstant(toMillis(l.endTime)),
		durationSeconds: seconds(l.startTime, l.endTime),
		...(routeName ? { routeName } : {}),
		...(l.headsign ? { headsign: l.headsign } : {}),
		...(l.tripId ? { tripId: l.tripId } : {}),
		...(l.legGeometry
			? { geometry: { points: l.legGeometry.points, precision: l.legGeometry.precision } }
			: {})
	};
}

export function toJourney(it: MotisItinerary, names: EndpointNames): Journey {
	const legs = it.legs.map((l) => leg(l, names));
	return {
		startTime: formatInstant(toMillis(it.startTime)),
		endTime: formatInstant(toMillis(it.endTime)),
		durationSeconds: seconds(it.startTime, it.endTime),
		walkingBudgetSeconds: legs
			.filter((l) => l.mode === 'WALK')
			.reduce((sum, l) => sum + l.durationSeconds, 0),
		transfers: it.transfers,
		legs
	};
}

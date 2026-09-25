// A destination next to the starting point is not a trip: from Pergine station, "Pergine
// Valsugana – centro storico" is a walk, not a day out by public transport. Such
// destinations are left out of the proposals (docs/ROUTING.md, "Destinations you are
// already at").
import type { Point, Proposal } from '$lib/api/types';

/** Straight-line distance under which a destination counts as "already there". */
export const ALREADY_THERE_METRES = 3000;

/** Great-circle distance in metres. */
export function distanceMetres(a: Point, b: Point): number {
	const r = 6_371_000;
	const rad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * rad;
	const dLon = (b.lon - a.lon) * rad;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
	return 2 * r * Math.asin(Math.sqrt(h));
}

export function alreadyThere(origin: Point, entrance: Point): boolean {
	return distanceMetres(origin, entrance) < ALREADY_THERE_METRES;
}

/** The starting point of a proposal: where its outbound journey begins. */
export function proposalOrigin(proposal: Proposal): Point | undefined {
	return proposal.outbound.legs[0]?.from.point;
}

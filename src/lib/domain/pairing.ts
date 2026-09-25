// Outbound/return pairing and backup selection from docs/ROUTING.md ("Choosing the return").
import type { Journey, NormalizedSearchRequest, Proposal } from '$lib/api/types';
import {
	durationSeconds,
	journeyViolations,
	pairViolations,
	staySeconds,
	walkingSeconds
} from './constraints';
import { toMillis } from './time';

/**
 * Identity of the first public transport vehicle of a journey. Two journeys that board
 * the same first vehicle are variants, not independent options.
 */
export function firstTransitTrip(journey: Journey): string {
	const leg = journey.legs.find((l) => l.mode !== 'WALK');
	if (!leg) return '';
	return leg.tripId ?? `${leg.routeName ?? leg.mode}|${leg.from.stopId ?? leg.from.name}|${leg.startTime}`;
}

/** Signature of trips, stops and instants, used to drop duplicate itineraries. */
export function journeySignature(journey: Journey): string {
	return journey.legs
		.map((l) =>
			[l.mode, l.tripId ?? '', l.from.stopId ?? l.from.name, l.to.stopId ?? l.to.name, toMillis(l.startTime), toMillis(l.endTime)].join('|')
		)
		.join('>');
}

export function dedupe(journeys: Journey[]): Journey[] {
	const seen = new Set<string>();
	return journeys.filter((j) => {
		const key = journeySignature(j);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Deduplicated journeys that satisfy every per-leg constraint. */
export function validJourneys(journeys: Journey[], request: NormalizedSearchRequest): Journey[] {
	return dedupe(journeys).filter((j) => journeyViolations(j, request).length === 0);
}

interface Candidate {
	outbound: Journey;
	inbound: Journey;
	backup?: Journey;
}

function totalDuration(c: Candidate): number {
	return durationSeconds(c.outbound) + durationSeconds(c.inbound);
}

function totalTransfers(c: Candidate): number {
	return c.outbound.transfers + c.inbound.transfers;
}

function totalWalking(c: Candidate): number {
	return walkingSeconds(c.outbound) + walkingSeconds(c.inbound);
}

/** Earliest later return on a distinct first trip that still forms a valid pair. */
function findBackup(
	outbound: Journey,
	inbound: Journey,
	inbounds: Journey[],
	request: NormalizedSearchRequest
): Journey | undefined {
	const first = firstTransitTrip(inbound);
	return inbounds
		.filter(
			(i) =>
				toMillis(i.startTime) > toMillis(inbound.startTime) &&
				firstTransitTrip(i) !== first &&
				pairViolations(outbound, i, request).length === 0
		)
		.sort((a, b) => toMillis(a.startTime) - toMillis(b.startTime))[0];
}

function compareCandidates(a: Candidate, b: Candidate): number {
	return (
		Number(Boolean(b.backup)) - Number(Boolean(a.backup)) ||
		staySeconds(b.outbound, b.inbound) - staySeconds(a.outbound, a.inbound) ||
		totalDuration(a) - totalDuration(b) ||
		totalTransfers(a) - totalTransfers(b) ||
		totalWalking(a) - totalWalking(b) ||
		toMillis(a.outbound.startTime) - toMillis(b.outbound.startTime) ||
		toMillis(a.inbound.startTime) - toMillis(b.inbound.startTime)
	);
}

/**
 * Chooses the proposal for one destination from raw engine itineraries, or null when no
 * outbound/return pair satisfies the request. Pairs with a backup return come first; then
 * longest stay, shortest total duration, fewest transfers and least walking.
 */
export function chooseProposal(
	destinationId: string,
	outbounds: Journey[],
	inbounds: Journey[],
	request: NormalizedSearchRequest
): Proposal | null {
	const outs = validJourneys(outbounds, request);
	const ins = validJourneys(inbounds, request);

	const candidates: Candidate[] = [];
	for (const outbound of outs) {
		for (const inbound of ins) {
			if (pairViolations(outbound, inbound, request).length > 0) continue;
			candidates.push({ outbound, inbound, backup: findBackup(outbound, inbound, ins, request) });
		}
	}
	const best = candidates.sort(compareCandidates)[0];
	if (!best) return null;

	return {
		destinationId,
		outbound: best.outbound,
		inbound: best.inbound,
		...(best.backup ? { backupInbound: best.backup } : {}),
		staySeconds: staySeconds(best.outbound, best.inbound),
		returnStatus: best.backup ? 'later_option_found' : 'no_later_option_found'
	};
}

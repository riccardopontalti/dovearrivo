// Constraints from docs/ROUTING.md applied to single journeys and outbound/return pairs.
// Everything is computed in seconds from the actual instants, without rounding.
import type { Journey, NormalizedSearchRequest } from '$lib/api/types';
import { localDate, toMillis } from './time';

export type Violation =
	| 'NO_TRANSIT'
	| 'TOO_LONG'
	| 'TOO_MUCH_WALKING'
	| 'TOO_MANY_TRANSFERS'
	| 'STARTS_BEFORE_WINDOW'
	| 'ENDS_AFTER_WINDOW'
	| 'OUTSIDE_SELECTED_DAY'
	| 'STAY_TOO_SHORT';

export function durationSeconds(journey: Journey): number {
	return (toMillis(journey.endTime) - toMillis(journey.startTime)) / 1000;
}

/** Sum of all WALK legs of the journey, not only access and egress. */
export function walkingSeconds(journey: Journey): number {
	return journey.legs
		.filter((leg) => leg.mode === 'WALK')
		.reduce((sum, leg) => sum + (toMillis(leg.endTime) - toMillis(leg.startTime)) / 1000, 0);
}

export function staySeconds(outbound: Journey, inbound: Journey): number {
	return (toMillis(inbound.startTime) - toMillis(outbound.endTime)) / 1000;
}

/** Limits that apply to each leg on its own. */
export function journeyViolations(journey: Journey, request: NormalizedSearchRequest): Violation[] {
	const violations: Violation[] = [];
	if (!journey.legs.some((leg) => leg.mode !== 'WALK')) violations.push('NO_TRANSIT');
	if (durationSeconds(journey) > request.maxJourneyMinutes * 60) violations.push('TOO_LONG');
	if (walkingSeconds(journey) > request.maxWalkMinutes * 60) violations.push('TOO_MUCH_WALKING');
	if (journey.transfers > request.maxTransfers) violations.push('TOO_MANY_TRANSFERS');

	const day = localDate(request.departAfter);
	if (localDate(journey.startTime) !== day || localDate(journey.endTime) !== day) {
		violations.push('OUTSIDE_SELECTED_DAY');
	}
	if (toMillis(journey.startTime) < toMillis(request.departAfter)) {
		violations.push('STARTS_BEFORE_WINDOW');
	}
	if (toMillis(journey.endTime) > toMillis(request.returnBy)) violations.push('ENDS_AFTER_WINDOW');
	return violations;
}

/** Violations of an outbound/return pair; an empty list means the pair can be proposed. */
export function pairViolations(
	outbound: Journey,
	inbound: Journey,
	request: NormalizedSearchRequest
): Violation[] {
	const violations = new Set([
		...journeyViolations(outbound, request),
		...journeyViolations(inbound, request)
	]);
	if (staySeconds(outbound, inbound) < request.minStayMinutes * 60) {
		violations.add('STAY_TOO_SHORT');
	}
	return [...violations];
}

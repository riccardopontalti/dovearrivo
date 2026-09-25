// Evaluates one destination: two plan profiles (outbound and return), at most one extra
// page per direction, then pairing. Engine failures become outcomes, never itineraries.
import type { Destination, Journey, NormalizedSearchRequest } from '$lib/api/types';
import type { DestinationOutcome } from '$lib/domain/outcome';
import { chooseProposal } from '$lib/domain/pairing';
import { ApiError } from '../errors';
import type { Limiter } from '../limiter';
import { MotisError, type MotisClient } from './client';
import { toJourney, type MotisItinerary } from './normalize';
import { coordinatePlace, MAX_ITINERARIES, planQuery, type Direction } from './params';

export interface EvaluationContext {
	client: MotisClient;
	limiter: Limiter;
	request: NormalizedSearchRequest;
	signal: AbortSignal;
}

interface Profile {
	itineraries: MotisItinerary[];
	truncated: boolean;
}

async function fetchProfile(
	ctx: EvaluationContext,
	direction: Direction,
	from: string,
	to: string
): Promise<Profile> {
	const call = (cursor?: string) =>
		ctx.limiter.run(
			() => ctx.client.plan(planQuery(direction, from, to, ctx.request, cursor), ctx.signal),
			ctx.signal
		);

	const first = await call();
	if (first.itineraries.length < MAX_ITINERARIES) {
		return { itineraries: first.itineraries, truncated: false };
	}
	// A full page may hide itineraries: later ones for the outbound journey, earlier
	// ones for the return (arriveBy). Follow the opaque cursor once.
	const cursor = direction === 'outbound' ? first.nextPageCursor : first.previousPageCursor;
	if (!cursor) return { itineraries: first.itineraries, truncated: true };
	const second = await call(cursor);
	return {
		itineraries: [...first.itineraries, ...second.itineraries],
		truncated: second.itineraries.length >= MAX_ITINERARIES
	};
}

export async function evaluateDestination(
	ctx: EvaluationContext,
	destination: Destination
): Promise<DestinationOutcome> {
	const origin = ctx.request.originStopId;
	const entrance = coordinatePlace(destination.entrance);
	try {
		const [out, back] = await Promise.all([
			fetchProfile(ctx, 'outbound', origin, entrance),
			fetchProfile(ctx, 'inbound', entrance, origin)
		]);
		// MOTIS names coordinate endpoints START/END; the origin is a stop and keeps its name.
		const outbounds: Journey[] = out.itineraries.map((it) =>
			toJourney(it, { start: origin, end: destination.name })
		);
		const inbounds: Journey[] = back.itineraries.map((it) =>
			toJourney(it, { start: destination.name, end: origin })
		);
		return {
			destinationId: destination.id,
			kind: 'evaluated',
			proposal: chooseProposal(destination.id, outbounds, inbounds, ctx.request),
			truncated: out.truncated || back.truncated
		};
	} catch (error) {
		if (error instanceof MotisError && error.unknownLocation) {
			throw new ApiError(422, 'UNKNOWN_ORIGIN', 'The origin stop is not in the active data');
		}
		if (ctx.signal.aborted || (error instanceof MotisError && error.kind === 'timeout')) {
			return { destinationId: destination.id, kind: 'timeout' };
		}
		return { destinationId: destination.id, kind: 'upstream_error' };
	}
}

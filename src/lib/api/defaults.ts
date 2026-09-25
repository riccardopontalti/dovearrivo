import { schemas } from './schemas.gen';
import type { NormalizedSearchRequest, SearchRequest } from './types';

const props = schemas.SearchRequest.properties;

/** Fills optional search limits with the defaults declared in the contract. */
export function applyDefaults(request: SearchRequest): NormalizedSearchRequest {
	return {
		originStopId: request.originStopId,
		departAfter: request.departAfter,
		returnBy: request.returnBy,
		maxJourneyMinutes: request.maxJourneyMinutes ?? props.maxJourneyMinutes.default,
		minStayMinutes: request.minStayMinutes ?? props.minStayMinutes.default,
		maxWalkMinutes: request.maxWalkMinutes ?? props.maxWalkMinutes.default,
		maxTransfers: request.maxTransfers ?? props.maxTransfers.default
	};
}

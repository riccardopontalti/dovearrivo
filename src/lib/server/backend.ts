// The backend behind the public API. D02 ships a mock over the synthetic fixture;
// D04 adds the MOTIS implementation behind the same interface.
import type {
	DataStatus,
	Destination,
	NormalizedSearchRequest,
	SearchResponse,
	Stop
} from '$lib/api/types';
import { createMockBackend } from './mock/backend';

export interface Backend {
	findStops(query: string): Promise<Stop[]>;
	listDestinations(): Promise<Destination[]>;
	/** Throws ApiError for unknown origins or uncovered dates. */
	search(request: NormalizedSearchRequest): Promise<SearchResponse>;
	dataStatus(): Promise<DataStatus>;
}

let current: Backend | undefined;

export function backend(): Backend {
	current ??= createMockBackend();
	return current;
}

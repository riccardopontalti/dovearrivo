// The backend behind the public API, chosen by environment:
//   DOVEARRIVO_BACKEND=mock (default)  synthetic fixture, no engine needed
//   DOVEARRIVO_BACKEND=motis           private MOTIS at MOTIS_URL, catalogue and manifest files
import { env } from '$env/dynamic/private';
import type {
	DataStatus,
	Destination,
	NormalizedSearchRequest,
	SearchResponse,
	Stop
} from '$lib/api/types';
import { loadCatalogue, type Catalogue } from './catalogue';
import { loadManifest } from './manifest';
import { createMockBackend } from './mock/backend';
import { createMotisBackend } from './motis/backend';
import { createMotisClient } from './motis/client';

export interface Backend {
	findStops(query: string): Promise<Stop[]>;
	listDestinations(): Promise<Destination[]>;
	/** Throws ApiError for unknown origins, uncovered dates or unavailable data. */
	search(request: NormalizedSearchRequest): Promise<SearchResponse>;
	dataStatus(): Promise<DataStatus>;
}

let current: Backend | undefined;

function fromEnvironment(): Backend {
	if ((env.DOVEARRIVO_BACKEND ?? 'mock') !== 'motis') return createMockBackend();

	const cataloguePath = env.DOVEARRIVO_CATALOGUE ?? 'catalogue/destinations.yaml';
	const manifestPath = env.DOVEARRIVO_MANIFEST ?? 'data/manifest.json';
	// The catalogue is immutable for the life of the process; the manifest is re-read so a
	// new data snapshot is picked up after a switch.
	let catalogue: Promise<Catalogue> | undefined;
	return createMotisBackend({
		client: createMotisClient(env.MOTIS_URL ?? 'http://127.0.0.1:8080'),
		catalogue: () => (catalogue ??= loadCatalogue(cataloguePath)),
		manifest: () => loadManifest(manifestPath),
		includeDrafts: env.DOVEARRIVO_INCLUDE_DRAFTS === 'true'
	});
}

export function backend(): Backend {
	current ??= fromEnvironment();
	return current;
}

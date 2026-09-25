// Backend over a private MOTIS instance, the destination catalogue and the snapshot manifest.
import type { NormalizedSearchRequest, SearchResponse, Stop } from '$lib/api/types';
import { summarize } from '$lib/domain/outcome';
import { formatInstant, localDate } from '$lib/domain/time';
import type { Backend } from '../backend';
import { LruCache } from '../cache';
import { toDestination, visibleEntries, type Catalogue } from '../catalogue';
import { ApiError } from '../errors';
import { Limiter } from '../limiter';
import { deriveDataStatus, type Manifest } from '../manifest';
import type { MotisClient } from './client';
import { evaluateDestination } from './evaluate';

export const ENGINE_VERSION = 'motis-2.11.3';

export interface MotisBackendOptions {
	client: MotisClient;
	catalogue: () => Promise<Catalogue>;
	manifest: () => Promise<Manifest | null>;
	includeDrafts?: boolean;
	now?: () => number;
	/** Whole-search budget; docs/ARCHITECTURE.md sets 12 s. */
	budgetMs?: number;
	limiter?: Limiter;
}

const CACHE_BYTES = 64 * 1024 * 1024;
const CACHE_TTL_MS = 15 * 60 * 1000;

export function createMotisBackend(options: MotisBackendOptions): Backend {
	const now = options.now ?? Date.now;
	const includeDrafts = options.includeDrafts ?? false;
	const budgetMs = options.budgetMs ?? 12_000;
	const limiter = options.limiter ?? new Limiter(4);
	const cache = new LruCache<SearchResponse>(CACHE_BYTES, CACHE_TTL_MS, now);

	async function destinations() {
		const catalogue = await options.catalogue();
		return { catalogue, entries: visibleEntries(catalogue, includeDrafts) };
	}

	return {
		async findStops(query): Promise<Stop[]> {
			const matches = await options.client.geocode(query);
			return matches
				.filter((m) => m.type === 'STOP' && m.id)
				.slice(0, 20)
				.map((m) => ({
					id: m.id as string,
					name: m.name,
					point: { lat: m.lat, lon: m.lon },
					feedId: (m.id as string).split('_')[0]
				}));
		},

		async listDestinations() {
			const { entries } = await destinations();
			return entries.map((e) => toDestination(e));
		},

		async search(request: NormalizedSearchRequest): Promise<SearchResponse> {
			const manifest = await options.manifest();
			const status = deriveDataStatus(manifest, now());
			if (!manifest || status.status === 'unavailable') {
				throw new ApiError(503, 'DATA_UNAVAILABLE', 'Timetable data is not available right now', {
					'retry-after': '300'
				});
			}
			const day = localDate(request.departAfter);
			if (day < manifest.availableFrom || day > manifest.availableTo) {
				throw new ApiError(
					422,
					'DATE_NOT_COVERED',
					`Timetables are available from ${manifest.availableFrom} to ${manifest.availableTo}`
				);
			}

			const { catalogue, entries } = await destinations();
			const key = JSON.stringify([request, catalogue.version, manifest.dataVersion, ENGINE_VERSION]);
			const cached = cache.get(key);
			if (cached) return cached;

			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(new Error('search budget exceeded')), budgetMs);
			let outcomes;
			try {
				const ctx = { client: options.client, limiter, request, signal: controller.signal };
				outcomes = await Promise.all(
					entries.map((e) => evaluateDestination(ctx, toDestination(e)))
				);
			} catch (error) {
				controller.abort(error);
				throw error;
			} finally {
				clearTimeout(timer);
			}

			const summary = summarize(
				outcomes,
				status.status === 'warning' ? ['DATA_CHECK_OVERDUE'] : []
			);
			if (summary.allFailed) {
				throw new ApiError(503, 'ROUTING_UNAVAILABLE', 'The routing engine is not responding', {
					'retry-after': '30'
				});
			}
			const response: SearchResponse = {
				status: summary.status,
				dataVersion: manifest.dataVersion,
				generatedAt: formatInstant(now()),
				normalizedRequest: request,
				catalogCount: summary.catalogCount,
				evaluatedCount: summary.evaluatedCount,
				warnings: summary.warnings,
				proposals: summary.proposals
			};
			if (response.status === 'complete') {
				cache.set(key, response, JSON.stringify(response).length);
			}
			return response;
		},

		async dataStatus() {
			return deriveDataStatus(await options.manifest(), now());
		}
	};
}

import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { request } from '$lib/domain/fixtures';
import { parseCatalogue } from '../catalogue';
import { ApiError } from '../errors';
import type { Manifest } from '../manifest';
import { createMotisBackend } from './backend';
import { MotisError } from './client';
import { busItinerary, fakeClient, type PlanHandler } from './fake-client';
import { MAX_ITINERARIES } from './params';

const NOW = Date.parse('2026-09-25T10:00:00+02:00');

const manifest: Manifest = {
	dataVersion: 'test-1',
	availableFrom: '2026-09-24',
	availableTo: '2026-10-24',
	sources: [
		{
			id: 'tte',
			publisher: 'Trentino Trasporti',
			checkedAt: '2026-09-25T06:00:00Z',
			sourceUrl: 'https://www.trentinotrasporti.it/it/opendata-it',
			licenseUrl: 'https://creativecommons.org/licenses/by/2.5/it/'
		}
	],
	limitations: []
};

function entry(id: string, status: 'draft' | 'published', lat: number) {
	return `- id: ${id}
  status: ${status}
  name: { it: ${id}, en: ${id} }
  category: lake
  description: { it: descrizione, en: description }
  entrance: { lat: ${lat}, lon: 11.2 }
  infoUrl: https://example.org/${id}
  check: { checkedAt: 2026-09-25, checkedBy: test, coordinateSource: test }
`;
}

const catalogue = parseCatalogue(
	entry('lake-a', 'published', 46.1) + entry('lake-b', 'published', 46.2) + entry('draft-c', 'draft', 46.3)
);

/** Destinations are told apart by the latitude of their entrance in the query. */
function byDestination(handlers: Record<string, PlanHandler>): PlanHandler {
	return (q) => {
		const place = q.get('arriveBy') === 'true' ? q.get('fromPlace') : q.get('toPlace');
		const lat = place!.split(',')[0];
		return handlers[lat](q);
	};
}

const regular: PlanHandler = (q) => ({
	itineraries:
		q.get('arriveBy') === 'true'
			? [busItinerary('15:00', '15:30', 'back15'), busItinerary('16:00', '16:30', 'back16')]
			: [busItinerary('09:00', '09:30', 'out09')]
});

function backend(plan: PlanHandler, extra: Partial<Parameters<typeof createMotisBackend>[0]> = {}) {
	const fake = fakeClient(plan);
	const b = createMotisBackend({
		client: fake.client,
		catalogue: async () => catalogue,
		manifest: async () => manifest,
		now: () => NOW,
		...extra
	});
	return { backend: b, calls: fake.calls };
}

describe('MOTIS backend search', () => {
	it('evaluates published destinations only and returns a contract-valid ranked response', async () => {
		const { backend: b, calls } = backend(regular);
		const r = await b.search(request());
		expect(validate('SearchResponse', r)).toEqual({ ok: true });
		expect(r).toMatchObject({ status: 'complete', catalogCount: 2, evaluatedCount: 2 });
		expect(r.proposals.map((p) => p.destinationId)).toEqual(['lake-a', 'lake-b']);
		expect(r.proposals[0].returnStatus).toBe('later_option_found');
		expect(calls).toHaveLength(4); // 2 destinations × 2 profiles
	});

	it('keeps other destinations when one times out (C09)', async () => {
		const { backend: b } = backend(
			byDestination({
				'46.1': regular,
				'46.2': () => {
					throw new MotisError('timeout', 'slow');
				}
			})
		);
		const r = await b.search(request());
		expect(r).toMatchObject({ status: 'partial', evaluatedCount: 1, warnings: ['PARTIAL_TIMEOUT'] });
		expect(r.proposals).toHaveLength(1);
	});

	it('answers 503 when every destination fails', async () => {
		const { backend: b } = backend(() => {
			throw new MotisError('http', 'boom', 500);
		});
		await expect(b.search(request())).rejects.toMatchObject({ status: 503, code: 'ROUTING_UNAVAILABLE' });
	});

	it('maps an unknown origin stop to 422 UNKNOWN_ORIGIN', async () => {
		const { backend: b } = backend(() => {
			throw new MotisError('http', 'Could not find timetable location "tte_9"', 404);
		});
		await expect(b.search(request())).rejects.toMatchObject({ status: 422, code: 'UNKNOWN_ORIGIN' });
	});

	it('follows one extra page per direction and reports truncation', async () => {
		const full = Array.from({ length: MAX_ITINERARIES }, (_, i) =>
			busItinerary('09:00', '09:30', `out-${i}`)
		);
		const { backend: b, calls } = backend((q) =>
			q.get('arriveBy') === 'true'
				? { itineraries: [busItinerary('15:00', '15:30', 'back')] }
				: { itineraries: full, nextPageCursor: 'LATER|1' }
		);
		const r = await b.search(request());
		const outboundCalls = calls.filter((q) => q.get('arriveBy') === 'false');
		// Per destination: first page, then exactly one follow-up with the cursor.
		expect(outboundCalls.map((q) => q.get('pageCursor')).sort()).toEqual(['LATER|1', 'LATER|1', null, null]);
		expect(r.status).toBe('partial');
		expect(r.warnings).toContain('PARTIAL_TRUNCATED');
	});

	it('serves an identical complete search from cache', async () => {
		const { backend: b, calls } = backend(regular);
		await b.search(request());
		await b.search(request());
		expect(calls).toHaveLength(4);
	});

	it('distinguishes uncovered dates and missing data', async () => {
		const { backend: b } = backend(regular);
		const late = request({
			departAfter: '2026-11-02T08:00:00+01:00',
			returnBy: '2026-11-02T18:00:00+01:00'
		});
		await expect(b.search(late)).rejects.toMatchObject({ status: 422, code: 'DATE_NOT_COVERED' });

		const { backend: none } = backend(regular, { manifest: async () => null });
		await expect(none.search(request())).rejects.toBeInstanceOf(ApiError);
		await expect(none.search(request())).rejects.toMatchObject({ code: 'DATA_UNAVAILABLE' });
		expect((await none.dataStatus()).status).toBe('unavailable');
	});

	it('shows drafts only when explicitly allowed', async () => {
		expect((await backend(regular).backend.listDestinations()).map((d) => d.id)).toEqual([
			'lake-a',
			'lake-b'
		]);
		const dev = backend(regular, { includeDrafts: true }).backend;
		expect(await dev.listDestinations()).toHaveLength(3);
	});
});

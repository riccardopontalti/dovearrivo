import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { request } from '$lib/domain/fixtures';
import { ApiError } from '../errors';
import { createMockBackend } from './backend';

const NOW = Date.parse('2026-09-25T10:00:00+02:00');
const mock = createMockBackend(() => NOW);

describe('mock backend conforms to the contract', () => {
	it('returns stops, destinations and data status that match their schemas', async () => {
		const stops = await mock.findStops('sintetica');
		expect(stops.length).toBe(2);
		for (const s of stops) expect(validate('Stop', s)).toEqual({ ok: true });
		for (const d of await mock.listDestinations()) {
			expect(validate('Destination', d)).toEqual({ ok: true });
		}
		expect(validate('DataStatus', await mock.dataStatus())).toEqual({ ok: true });
	});

	it('reproduces the C01 proposal from the synthetic timetable', async () => {
		const response = await mock.search(request({ maxJourneyMinutes: 60 }));
		expect(validate('SearchResponse', response)).toEqual({ ok: true });
		expect(response.status).toBe('complete');
		expect(response.proposals).toHaveLength(1);

		const [p] = response.proposals;
		expect(p.outbound.startTime).toBe('2026-09-26T09:00:00+02:00');
		expect(p.inbound.startTime).toBe('2026-09-26T15:00:00+02:00');
		expect(p.staySeconds).toBe(19800);
		expect(p.returnStatus).toBe('no_later_option_found');
	});

	it('returns a complete empty result when no pair satisfies the filters', async () => {
		const response = await mock.search(request({ minStayMinutes: 480 }));
		expect(response.status).toBe('complete');
		expect(response.proposals).toEqual([]);
	});

	it('uses the winter offset on the day of the DST change', async () => {
		const response = await mock.search(
			request({ departAfter: '2026-10-25T08:00:00+01:00', returnBy: '2026-10-25T18:00:00+01:00' })
		);
		expect(response.proposals[0].outbound.startTime).toBe('2026-10-25T09:00:00+01:00');
	});

	it('distinguishes an unknown origin from an uncovered date', async () => {
		await expect(mock.search(request({ originStopId: 'nope' }))).rejects.toMatchObject({
			code: 'UNKNOWN_ORIGIN',
			status: 422
		});
		const farAway = request({
			departAfter: '2026-12-01T08:00:00+01:00',
			returnBy: '2026-12-01T18:00:00+01:00'
		});
		await expect(mock.search(farAway)).rejects.toBeInstanceOf(ApiError);
		await expect(mock.search(farAway)).rejects.toMatchObject({ code: 'DATE_NOT_COVERED' });
	});
});

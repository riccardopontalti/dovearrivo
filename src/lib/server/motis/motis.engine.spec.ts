// Contract tests against the pinned MOTIS with the synthetic fixtures imported by
// scripts/engine-fixtures.sh. Run with `npm run test:engine` (MOTIS_URL, default :8090).
import { describe, expect, it } from 'vitest';
import { journeyViolations } from '$lib/domain/constraints';
import { request } from '$lib/domain/fixtures';
import { chooseProposal } from '$lib/domain/pairing';
import { createMotisClient, MotisError } from './client';
import { toJourney } from './normalize';
import { planQuery, type Direction } from './params';

const client = createMotisClient(process.env.MOTIS_URL ?? 'http://127.0.0.1:8090');
const names = { start: 'start', end: 'end' };

async function journeys(direction: Direction, from: string, to: string, req = request()) {
	const r = await client.plan(planQuery(direction, from, to, req));
	return r.itineraries.map((it) => toJourney(it, names));
}

describe('MOTIS v2.11.3 contract', () => {
	it('C01: plan finds the short trip despite waiting, and pairing keeps the longest stay', async () => {
		const req = request({ maxJourneyMinutes: 60 });
		const outs = await journeys('outbound', 'syn_A', 'syn_B', req);
		const ins = await journeys('inbound', 'syn_B', 'syn_A', req);
		const p = chooseProposal('syn-b', outs, ins, req);

		expect(p?.outbound.startTime).toBe('2026-09-26T09:00:00+02:00');
		expect(p?.inbound.startTime).toBe('2026-09-26T15:00:00+02:00');
		expect(p?.staySeconds).toBe(19800);
		expect(p?.returnStatus).toBe('no_later_option_found');
	});

	it('C02: the engine returns adjacent days and the filter removes them', async () => {
		const outs = await journeys('outbound', 'syn_A', 'syn_B');
		const ins = await journeys('inbound', 'syn_B', 'syn_A');
		const adjacent = [...outs, ...ins].filter((j) => !j.startTime.startsWith('2026-09-26'));

		expect(adjacent.length).toBeGreaterThan(0);
		for (const j of adjacent) expect(journeyViolations(j, request())).toContain('OUTSIDE_SELECTED_DAY');
	});

	it('C07: a trip at 31:10 on service day 26/09 runs on 27/09 at 07:10 local time', async () => {
		const req = request({
			originStopId: 'night_X',
			departAfter: '2026-09-27T06:00:00+02:00',
			returnBy: '2026-09-27T12:00:00+02:00'
		});
		const outs = await journeys('outbound', 'night_X', 'night_Y', req);
		const valid = outs.filter((j) => journeyViolations(j, req).length === 0);

		expect(valid.map((j) => j.startTime)).toEqual(['2026-09-27T07:10:00+02:00']);
		expect(valid[0].legs[0].tripId).toMatch(/^20260926_/); // service day kept in the id
	});

	it('reports an unknown stop as an unknown location', async () => {
		const error = await client
			.plan(planQuery('outbound', 'syn_NOPE', 'syn_B', request()))
			.catch((e: unknown) => e);
		expect(error).toBeInstanceOf(MotisError);
		expect((error as MotisError).unknownLocation).toBe(true);
	});
});

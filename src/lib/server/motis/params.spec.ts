import { describe, expect, it } from 'vitest';
import { request } from '$lib/domain/fixtures';
import { planQuery } from './params';

describe('planQuery', () => {
	it('serialises units and modes as ROUTING.md specifies', () => {
		const q = planQuery('outbound', 'tte_1', '46.01,11.29', request());
		expect(q.get('time')).toBe('2026-09-26T08:00:00+02:00');
		expect(q.get('arriveBy')).toBe('false');
		expect(q.get('searchWindow')).toBe('36000'); // seconds between T0 and T1
		expect(q.get('maxTravelTime')).toBe('90'); // minutes
		expect(q.get('maxPreTransitTime')).toBe('1200'); // seconds
		expect(q.get('preTransitModes')).toBe('WALK'); // a mode...
		expect(q.get('pedestrianProfile')).toBe('FOOT'); // ...and a profile
		expect(q.toString()).toContain('directModes=&'); // empty array, not omitted
	});

	it('searches the return backwards from T1', () => {
		const q = planQuery('inbound', '46.01,11.29', 'tte_1', request(), 'EARLIER|123');
		expect(q.get('time')).toBe('2026-09-26T18:00:00+02:00');
		expect(q.get('arriveBy')).toBe('true');
		expect(q.get('pageCursor')).toBe('EARLIER|123');
	});
});

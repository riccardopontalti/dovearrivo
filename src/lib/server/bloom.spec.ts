import { describe, expect, it } from 'vitest';
import { bloomDeparture, bloomOf, TRENTO } from './bloom';

const at = (iso: string) => Date.parse(iso);

describe('bloomDeparture', () => {
	it('rounds up to the next whole hour in Rome time', () => {
		expect(bloomDeparture(at('2026-09-26T08:17:00Z'))).toBe('2026-09-26T11:00:00+02:00');
		expect(bloomDeparture(at('2026-09-26T08:00:00Z'))).toBe('2026-09-26T10:00:00+02:00');
	});

	it('moves late evenings and nights to 08:00 of the right local morning', () => {
		// 21:30 in Rome is still 19:30 UTC: the next morning is the 27th.
		expect(bloomDeparture(at('2026-09-26T19:30:00Z'))).toBe('2026-09-27T08:00:00+02:00');
		// 00:30 in Rome is 22:30 UTC of the previous day: same local day, 08:00.
		expect(bloomDeparture(at('2026-09-25T22:30:00Z'))).toBe('2026-09-26T08:00:00+02:00');
	});

	it('keeps the local hour across the end of summer time', () => {
		expect(bloomDeparture(at('2026-10-25T09:40:00Z'))).toBe('2026-10-25T11:00:00+01:00');
	});
});

describe('bloomOf', () => {
	it('merges platforms at the same spot, keeping the earliest arrival, nearest first', () => {
		const b = bloomOf(TRENTO, {
			dataVersion: 'v1',
			departAfter: '2026-09-26T09:00:00+02:00',
			minutes: 90,
			places: [
				{ name: 'Far', point: { lat: 46.2, lon: 11.3 }, minutes: 80, transfers: 1 },
				{ name: 'Platform 2', point: { lat: 46.100004, lon: 11.100004 }, minutes: 25, transfers: 0 },
				{ name: 'Platform 1', point: { lat: 46.1, lon: 11.1 }, minutes: 12, transfers: 0 }
			]
		});
		expect(b.points).toEqual([11.1, 46.1, 12, 11.3, 46.2, 80]);
		expect(b.origin.name).toBe('Trento');
	});
});

import { describe, expect, it } from 'vitest';
import { journeyViolations, pairViolations, staySeconds, walkingSeconds } from './constraints';
import { journeyOf, leg, request } from './fixtures';

const DAY = '2026-09-26';

describe('initial waiting is not journey duration (C01)', () => {
	it('accepts a 30-minute bus leaving an hour after the window opens', () => {
		const outbound = journeyOf([leg('BUS', DAY, '09:00', '09:30', 'OUT09')]);
		const inbound = journeyOf([leg('BUS', DAY, '15:00', '15:30', 'BACK15')]);
		const req = request({ maxJourneyMinutes: 60 });

		expect(pairViolations(outbound, inbound, req)).toEqual([]);
		expect(staySeconds(outbound, inbound)).toBe(19800);
	});
});

describe('trips on adjacent days are rejected (C02)', () => {
	it('rejects an outbound on the next day and a return on the previous day', () => {
		const nextDay = journeyOf([leg('BUS', '2026-09-27', '09:00', '09:30')]);
		const previousDay = journeyOf([leg('BUS', '2026-09-25', '15:00', '15:30')]);

		expect(journeyViolations(nextDay, request())).toContain('OUTSIDE_SELECTED_DAY');
		expect(journeyViolations(previousDay, request())).toContain('OUTSIDE_SELECTED_DAY');
	});
});

describe('walking limit applies to the whole leg (C05)', () => {
	it('sums every WALK segment: 10 + 12 minutes exceed 20', () => {
		const j = journeyOf(
			[
				leg('WALK', DAY, '09:00', '09:10'),
				leg('BUS', DAY, '09:10', '09:40'),
				leg('WALK', DAY, '09:40', '09:52')
			],
			0
		);
		expect(walkingSeconds(j)).toBe(1320);
		expect(journeyViolations(j, request())).toContain('TOO_MUCH_WALKING');
	});
});

describe('minimum stay without rounding (C06)', () => {
	it('rejects a stay one second short of 120 minutes', () => {
		const outbound = journeyOf([leg('BUS', DAY, '09:30', '10:00')]);
		const inbound = journeyOf([leg('BUS', DAY, '11:59:59', '12:30')]);

		expect(staySeconds(outbound, inbound)).toBe(7199);
		expect(pairViolations(outbound, inbound, request())).toEqual(['STAY_TOO_SHORT']);
	});
});

describe('other leg limits', () => {
	it('rejects a walk-only journey', () => {
		const j = journeyOf([leg('WALK', DAY, '09:00', '09:15')]);
		expect(journeyViolations(j, request())).toContain('NO_TRANSIT');
	});

	it('rejects legs outside the availability window', () => {
		const early = journeyOf([leg('BUS', DAY, '07:30', '08:10')]);
		const late = journeyOf([leg('BUS', DAY, '17:40', '18:10')]);
		expect(journeyViolations(early, request())).toContain('STARTS_BEFORE_WINDOW');
		expect(journeyViolations(late, request())).toContain('ENDS_AFTER_WINDOW');
	});

	it('rejects too many transfers and too long journeys', () => {
		const j = journeyOf([leg('BUS', DAY, '09:00', '10:31')], 2);
		expect(journeyViolations(j, request())).toEqual(
			expect.arrayContaining(['TOO_MANY_TRANSFERS', 'TOO_LONG'])
		);
	});
});

import { describe, expect, it } from 'vitest';
import type { Proposal } from './api/types';
import { journeyOf, leg } from './domain/fixtures';
import { clockLabel, minutesOfDay, ribbonOf } from './ribbon';

function proposal(date: string, out: [string, string], back: [string, string], backup?: [string, string]): Proposal {
	const j = ([s, e]: [string, string]) => journeyOf([leg('BUS', date, s, e)]);
	const outbound = j(out);
	const inbound = j(back);
	return {
		destinationId: 'b',
		outbound,
		inbound,
		...(backup ? { backupInbound: j(backup) } : {}),
		staySeconds: (Date.parse(inbound.startTime) - Date.parse(outbound.endTime)) / 1000,
		returnStatus: backup ? 'later_option_found' : 'no_later_option_found'
	};
}

describe('ribbonOf', () => {
	it('places outbound, stay, return and backup on the chosen window', () => {
		const r = ribbonOf(proposal('2026-09-26', ['09:00', '09:30'], ['15:00', '15:30'], ['17:00', '17:40']), '2026-09-26', '09:00', '19:00');
		expect([r.from, r.to]).toEqual([540, 1140]);
		expect(r.segments.map((s) => [s.kind, s.start, s.end])).toEqual([
			['outbound', 540, 570],
			['stay', 570, 900],
			['inbound', 900, 930],
			['backup', 1020, 1060]
		]);
		expect(r.segments[0].left).toBe(0);
		expect(r.segments[1].width).toBeCloseTo(55);
		expect(r.windowEnd).toBe(100);
	});

	it('keeps local clock positions on the day clocks go back (25 October 2026)', () => {
		// 25 hours in this day: elapsed time from midnight would put 09:00 at 10:00.
		const r = ribbonOf(proposal('2026-10-25', ['09:00', '09:45'], ['16:00', '16:45']), '2026-10-25', '09:00', '19:00');
		expect(r.segments[0].start).toBe(540);
		expect(r.segments[2].end).toBe(1005);
	});

	it('widens to whole hours around a window that starts or ends off the hour', () => {
		const r = ribbonOf(proposal('2026-09-26', ['08:40', '09:10'], ['18:10', '18:50']), '2026-09-26', '08:30', '19:15');
		expect([r.from, r.to]).toEqual([480, 1200]);
		expect(r.windowStart).toBeCloseTo((30 / 720) * 100);
		expect(r.ticks[0]).toEqual({ minutes: 480, at: 0 });
	});

	it('uses two-hour ticks on long days so labels do not collide on phones', () => {
		const r = ribbonOf(proposal('2026-09-26', ['06:30', '07:30'], ['21:00', '22:00']), '2026-09-26', '06:00', '22:00');
		expect(r.ticks.map((t) => clockLabel(t.minutes))).toEqual(['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']);
	});
});

describe('minutesOfDay', () => {
	it('counts an arrival after midnight on the following day', () => {
		expect(minutesOfDay('2026-09-27T00:20:00+02:00', '2026-09-26')).toBe(1460);
		expect(clockLabel(1460)).toBe('00:20');
	});

	it('reads instants in Europe/Rome whatever their offset', () => {
		expect(minutesOfDay('2026-09-26T07:00:00Z', '2026-09-26')).toBe(540);
	});
});

import { describe, expect, it } from 'vitest';
import { request } from './fixtures';
import { windowProblem } from './request';

const BEFORE = Date.parse('2026-09-25T10:00:00+02:00');

describe('search window rules', () => {
	it('accepts the default window on a future day', () => {
		expect(windowProblem(request(), BEFORE)).toBeNull();
	});

	it.each([
		['different days', { returnBy: '2026-09-27T10:00:00+02:00' }],
		['before 06:00', { departAfter: '2026-09-26T05:30:00+02:00' }],
		['after 23:00', { returnBy: '2026-09-26T23:30:00+02:00' }],
		['shorter than 2 hours', { returnBy: '2026-09-26T09:59:00+02:00' }],
		['longer than 16 hours', { departAfter: '2026-09-26T06:00:00+02:00', returnBy: '2026-09-26T22:01:00+02:00' }],
		['return before departure', { returnBy: '2026-09-26T07:00:00+02:00', departAfter: '2026-09-26T09:00:00+02:00' }]
	])('rejects %s', (_, overrides) => {
		expect(windowProblem(request(overrides), BEFORE)).not.toBeNull();
	});

	it('interprets the local day in Europe/Rome, not UTC', () => {
		// 23:00 local on 26/09 is 21:00Z; an offset-free UTC check would still pass,
		// but 00:30 local on 27/09 is 22:30Z on 26/09 and must count as another day.
		const r = request({ returnBy: '2026-09-26T22:30:00Z' });
		expect(windowProblem(r, BEFORE)).toBe('differentDays');
	});

	it('rejects past dates and, today, departures earlier than now', () => {
		const now = Date.parse('2026-09-26T12:00:00+02:00');
		expect(windowProblem(request(), Date.parse('2026-09-27T09:00:00+02:00'))).toBe('pastDate');
		expect(windowProblem(request(), now)).toBe('beforeNow');
		expect(
			windowProblem(request({ departAfter: '2026-09-26T12:30:00+02:00' }), now)
		).toBeNull();
	});
});

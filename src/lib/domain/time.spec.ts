import { describe, expect, it } from 'vitest';
import { formatInstant, localDate, localToMillis } from './time';

describe('Europe/Rome has no fixed offset (C08)', () => {
	it('converts 06:00 local to UTC in summer and in winter time', () => {
		expect(new Date(localToMillis('2026-09-26', '06:00')).toISOString()).toBe(
			'2026-09-26T04:00:00.000Z'
		);
		expect(new Date(localToMillis('2026-10-25', '06:00')).toISOString()).toBe(
			'2026-10-25T05:00:00.000Z'
		);
	});

	it('formats instants with the offset valid on that day', () => {
		expect(formatInstant(Date.parse('2026-10-24T07:00:00Z'))).toBe('2026-10-24T09:00:00+02:00');
		expect(formatInstant(Date.parse('2026-10-26T08:00:00Z'))).toBe('2026-10-26T09:00:00+01:00');
	});

	it('resolves the repeated hour of the autumn change to its first occurrence', () => {
		expect(formatInstant(localToMillis('2026-10-25', '02:30'))).toBe('2026-10-25T02:30:00+02:00');
	});

	it('moves a time skipped by the spring change after the gap', () => {
		expect(formatInstant(localToMillis('2027-03-28', '02:30'))).toBe('2027-03-28T03:30:00+02:00');
	});
});

describe('localDate', () => {
	it('uses the local calendar day, not the UTC one', () => {
		expect(localDate('2026-09-26T23:30:00Z')).toBe('2026-09-27');
		expect(localDate('2026-09-26T00:30:00+02:00')).toBe('2026-09-26');
	});
});

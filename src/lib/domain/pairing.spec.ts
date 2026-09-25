import { describe, expect, it } from 'vitest';
import { journeyOf, leg, request } from './fixtures';
import { chooseProposal, dedupe, firstTransitTrip } from './pairing';

const DAY = '2026-09-26';
const bus = (start: string, end: string, trip: string) => journeyOf([leg('BUS', DAY, start, end, trip)]);

describe('chooseProposal', () => {
	it('picks the longest stay among valid pairs (C01)', () => {
		const outbounds = [bus('09:00', '09:30', 'OUT09'), bus('10:00', '10:20', 'OUT10')];
		const inbounds = [bus('15:00', '15:30', 'BACK15')];
		const p = chooseProposal('b', outbounds, inbounds, request({ maxJourneyMinutes: 60 }));

		expect(p?.outbound.startTime).toBe('2026-09-26T09:00:00+02:00');
		expect(p?.staySeconds).toBe(19800);
		expect(p?.returnStatus).toBe('no_later_option_found');
		expect(p?.backupInbound).toBeUndefined();
	});

	it('proposes nothing when an outbound exists but no return (C03)', () => {
		expect(chooseProposal('b', [bus('09:00', '09:30', 'OUT09')], [], request())).toBeNull();
	});

	it('prefers a return that still has a later distinct option (C04)', () => {
		const outbound = bus('09:00', '09:30', 'OUT');
		const r14 = bus('14:00', '14:40', 'trip14@2026-09-26');
		const r15 = bus('15:00', '15:40', 'trip15@2026-09-26');
		const p = chooseProposal('b', [outbound], [r14, r15], request());

		expect(p?.inbound).toBe(r14);
		expect(p?.backupInbound).toBe(r15);
		expect(p?.returnStatus).toBe('later_option_found');
	});

	it('does not count a later variant on the same first bus as a backup (C04)', () => {
		const outbound = bus('09:00', '09:30', 'OUT');
		const direct = bus('14:00', '14:40', 'trip14');
		// Same first bus boarded at a later stop: starts later but is not a recovery option.
		const later = journeyOf([
			leg('WALK', DAY, '14:01', '14:05'),
			leg('BUS', DAY, '14:05', '14:40', 'trip14')
		]);
		const p = chooseProposal('b', [outbound], [direct, later], request());

		expect(firstTransitTrip(direct)).toBe(firstTransitTrip(later));
		expect(p?.backupInbound).toBeUndefined();
		expect(p?.returnStatus).toBe('no_later_option_found');
	});

	it('falls back to the longest valid stay when no pair has a backup', () => {
		const outbound = bus('09:00', '09:30', 'OUT');
		const onlyLate = bus('17:00', '17:40', 'LATE');
		const p = chooseProposal('b', [outbound], [onlyLate], request());
		expect(p?.inbound).toBe(onlyLate);
		expect(p?.returnStatus).toBe('no_later_option_found');
	});

	it('breaks equal stays by shorter total duration', () => {
		const slow = bus('09:00', '10:00', 'SLOW');
		const fast = journeyOf([leg('BUS', DAY, '09:30', '10:00', 'FAST')]);
		const back = bus('15:00', '15:30', 'BACK');
		const p = chooseProposal('b', [slow, fast], [back], request());
		expect(p?.outbound).toBe(fast);
	});

	it('ignores itineraries that violate the request before pairing (C02, C05)', () => {
		const nextDay = journeyOf([leg('BUS', '2026-09-27', '09:00', '09:30', 'X')]);
		const tooMuchWalking = journeyOf([
			leg('WALK', DAY, '09:00', '09:15'),
			leg('BUS', DAY, '09:15', '09:40', 'Y'),
			leg('WALK', DAY, '09:40', '09:50')
		]);
		const back = bus('15:00', '15:30', 'BACK');
		expect(chooseProposal('b', [nextDay, tooMuchWalking], [back], request())).toBeNull();
	});
});

describe('dedupe', () => {
	it('drops itineraries with the same trips, stops and instants', () => {
		const a = bus('09:00', '09:30', 'T');
		const b = bus('09:00', '09:30', 'T');
		const c = bus('10:00', '10:30', 'U');
		expect(dedupe([a, b, c])).toEqual([a, c]);
	});
});

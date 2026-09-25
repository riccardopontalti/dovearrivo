import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import recorded from '../../../../tests/fixtures/motis-plan-levico.json';
import { toJourney, type MotisItinerary } from './normalize';

const itinerary = recorded.itineraries[0] as MotisItinerary;

describe('toJourney on a recorded MOTIS response', () => {
	const journey = toJourney(itinerary, { start: 'Lago di Levico', end: 'Trento' });

	it('produces a contract-valid Journey with local offsets', () => {
		expect(validate('Journey', journey)).toEqual({ ok: true });
		expect(journey.startTime).toBe('2026-09-26T15:12:00+02:00');
		expect(journey.legs[1].startTime).toBe('2026-09-26T15:42:00+02:00');
	});

	it('names the coordinate endpoint instead of START and keeps stop ids', () => {
		expect(journey.legs[0].from.name).toBe('Lago di Levico');
		expect(journey.legs[0].from.stopId).toBeUndefined();
		expect(journey.legs[1].from.stopId).toMatch(/^trenitalia_/);
	});

	it('sums every WALK leg into the walking budget and keeps trip ids and geometry precision', () => {
		const walks = itinerary.legs.filter((l) => l.mode === 'WALK');
		const expected = walks.reduce((s, l) => s + (Date.parse(l.endTime) - Date.parse(l.startTime)) / 1000, 0);
		expect(journey.walkingBudgetSeconds).toBe(expected);
		expect(journey.transfers).toBe(1);
		expect(journey.legs[1].tripId).toMatch(/^20260926_/);
		expect(journey.legs[0].geometry?.precision).toBe(6);
	});
});

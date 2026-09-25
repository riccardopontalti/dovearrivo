import { describe, expect, it } from 'vitest';
import { alreadyThere, distanceMetres } from './nearby';

// Real places from the catalogue and the D01 samples.
const PERGINE_STATION = { lat: 46.0617, lon: 11.2366 };
const PERGINE_CENTRE = { lat: 46.0633, lon: 11.2407 };
const TRENTO_STATION = { lat: 46.0719, lon: 11.1194 };
const LEVICO_LAKESIDE = { lat: 46.0103715, lon: 11.2896984 };

describe('alreadyThere', () => {
	it('leaves out the town centre when you start from its station', () => {
		expect(alreadyThere(PERGINE_STATION, PERGINE_CENTRE)).toBe(true);
	});

	it('keeps real trips, even short ones by train', () => {
		// Trento → Pergine is about 9 km: a trip, not a walk.
		expect(alreadyThere(TRENTO_STATION, PERGINE_CENTRE)).toBe(false);
		expect(alreadyThere(PERGINE_STATION, LEVICO_LAKESIDE)).toBe(false);
	});
});

describe('distanceMetres', () => {
	it('measures along the Earth surface', () => {
		expect(distanceMetres(TRENTO_STATION, PERGINE_CENTRE)).toBeGreaterThan(9000);
		expect(distanceMetres(TRENTO_STATION, PERGINE_CENTRE)).toBeLessThan(10500);
		expect(distanceMetres(TRENTO_STATION, TRENTO_STATION)).toBe(0);
	});
});

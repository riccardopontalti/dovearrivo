import { describe, expect, it } from 'vitest';
import { decodePolyline } from './polyline';

describe('decodePolyline', () => {
	it('decodes the reference example at precision 5 as [lon, lat]', () => {
		expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)).toEqual([
			[-120.2, 38.5],
			[-120.95, 40.7],
			[-126.453, 43.252]
		]);
	});

	it('honours precision 6: the same string means coordinates ten times smaller', () => {
		const [first] = decodePolyline('_p~iF~ps|U', 6);
		expect(first[0]).toBeCloseTo(-12.02, 6);
		expect(first[1]).toBeCloseTo(3.85, 6);
	});

	it('rejects truncated input and unsupported precision', () => {
		expect(() => decodePolyline('_p~iF~ps|', 5)).toThrow(/Truncated/);
		expect(() => decodePolyline('', 9)).toThrow(/precision/);
	});
});

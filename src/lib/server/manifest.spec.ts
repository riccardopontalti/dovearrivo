import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { deriveDataStatus, type Manifest } from './manifest';

const base: Manifest = {
	dataVersion: 'v1',
	availableFrom: '2026-09-24',
	availableTo: '2026-10-24',
	sources: [
		{
			id: 'tte',
			publisher: 'Trentino Trasporti',
			checkedAt: '2026-09-25T06:00:00Z',
			sourceUrl: 'https://www.trentinotrasporti.it/it/opendata-it',
			licenseUrl: 'https://creativecommons.org/licenses/by/2.5/it/'
		}
	],
	limitations: []
};
const checked = Date.parse('2026-09-25T06:00:00Z');
const hours = (h: number) => checked + h * 3600 * 1000;

describe('deriveDataStatus', () => {
	it('is current right after a successful check, even if the feed itself is unchanged', () => {
		const s = deriveDataStatus(base, hours(1));
		expect(s.status).toBe('current');
		expect(validate('DataStatus', s)).toEqual({ ok: true });
	});

	it('warns after 72 hours without a successful check and suspends after 7 days', () => {
		expect(deriveDataStatus(base, hours(73)).status).toBe('warning');
		expect(deriveDataStatus(base, hours(7 * 24 + 1)).status).toBe('unavailable');
	});

	it('is unavailable when a source was never checked, the window expired or nothing is active', () => {
		const neverChecked = { ...base, sources: [{ ...base.sources[0], checkedAt: null }] };
		expect(deriveDataStatus(neverChecked, hours(1)).status).toBe('unavailable');
		expect(deriveDataStatus(base, Date.parse('2026-10-25T12:00:00Z')).status).toBe('unavailable');
		const none = deriveDataStatus(null, hours(1));
		expect(none.status).toBe('unavailable');
		expect(validate('DataStatus', none)).toEqual({ ok: true });
	});
});

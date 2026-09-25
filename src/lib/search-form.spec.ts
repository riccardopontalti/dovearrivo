import { describe, expect, it } from 'vitest';
import { defaultForm, readForm, toParams, toRequest } from './search-form';

const defaults = defaultForm('2026-09-25', '2026-09-25', '2026-10-25');

describe('search form in the URL', () => {
	it('defaults to tomorrow 09:00–19:00, or the first covered day', () => {
		expect(defaults).toMatchObject({ date: '2026-09-26', start: '09:00', end: '19:00' });
		expect(defaultForm('2026-09-25', '2026-09-28', '2026-10-25').date).toBe('2026-09-28');
		expect(defaultForm('2026-10-25', '2026-09-25', '2026-10-25').date).toBe('2026-10-25');
	});

	it('round-trips through URL parameters', () => {
		const form = { ...defaults, from: 'tte_1', fromQuery: 'Trento. Autostaz. Dante', maxWalkMinutes: 30 };
		expect(readForm(toParams(form), defaults)).toEqual(form);
	});

	it('replaces malformed or out-of-range values with defaults', () => {
		const p = new URLSearchParams({
			date: '26/09/2026',
			start: '25:00',
			end: '7pm',
			maxJourneyMinutes: '999',
			maxTransfers: '-1',
			minStayMinutes: 'abc'
		});
		expect(readForm(p, defaults)).toEqual(defaults);
	});

	it('turns a coordinate origin into originPoint with its label', () => {
		const r = toRequest({ ...defaults, fromQuery: 'Via Belenzani 1' }, '46.0689,11.1212');
		expect(r).toMatchObject({ originPoint: { lat: 46.0689, lon: 11.1212 }, originName: 'Via Belenzani 1' });
		expect(r.originStopId).toBeUndefined();
		expect(toRequest(defaults, 'trenitalia_IT::StopPlace:otherTRENITALIA:830002038').originStopId).toMatch(/^trenitalia_/);
	});

	it('builds instants with the offset valid on the chosen day', () => {
		const summer = toRequest({ ...defaults, date: '2026-09-26' }, 'tte_1');
		const winter = toRequest({ ...defaults, date: '2026-10-26' }, 'tte_1');
		expect(summer.departAfter).toBe('2026-09-26T09:00:00+02:00');
		expect(winter.returnBy).toBe('2026-10-26T19:00:00+01:00');
	});
});

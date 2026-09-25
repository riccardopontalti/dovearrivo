import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { createMockBackend } from './mock/backend';
import { parseReachability } from './reachability';

const params = (o: Record<string, string>) => new URLSearchParams(o);

describe('reachability preview', () => {
	it('validates parameters against the contract limits', () => {
		const ok = parseReachability(params({ from: 'tte_1', departAfter: '2026-09-26T09:00:00+02:00', minutes: '90' }));
		expect(ok).toEqual({ from: 'tte_1', departAfter: '2026-09-26T09:00:00+02:00', minutes: 90, maxTransfers: 1, maxWalkMinutes: 20 });
		expect(() => parseReachability(params({ from: 'tte_1', departAfter: '2026-09-26T09:00', minutes: '90' }))).toThrow(/offset/);
		expect(() => parseReachability(params({ from: 'tte_1', departAfter: '2026-09-26T09:00:00Z', minutes: '300' }))).toThrow(/minutes/);
		expect(() => parseReachability(params({ departAfter: '2026-09-26T09:00:00Z', minutes: '60' }))).toThrow(/from/);
	});

	it('counts initial waiting: from A at 08:00 the 09:00 bus reaches B after 90 minutes', async () => {
		const mock = createMockBackend(() => Date.parse('2026-09-25T10:00:00+02:00'));
		const base = { from: 'syn_A', departAfter: '2026-09-26T08:00:00+02:00', maxTransfers: 1, maxWalkMinutes: 20 };
		const within = await mock.reachability({ ...base, minutes: 90 });
		expect(validate('Reachability', within)).toEqual({ ok: true });
		expect(within.places).toEqual([expect.objectContaining({ name: 'Destinazione sintetica B', minutes: 90 })]);
		// The same 30-minute bus is outside a 60-minute preview: this is why one-to-all never
		// filters trip proposals (docs/ROUTING.md, case C01).
		expect((await mock.reachability({ ...base, minutes: 60 })).places).toEqual([]);
	});
});

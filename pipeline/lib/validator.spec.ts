import { describe, expect, it } from 'vitest';
import { validatorVerdict, type Notice } from './validator.ts';

const notices: Notice[] = [
	{ code: 'stop_too_far_from_shape', severity: 'WARNING', totalNotices: 189 },
	{ code: 'unknown_file', severity: 'INFO', totalNotices: 1 },
	{ code: 'foreign_key_violation', severity: 'ERROR', totalNotices: 3 }
];

describe('validatorVerdict', () => {
	it('blocks on errors and records warnings without blocking', () => {
		expect(validatorVerdict('ttu', notices, [])).toEqual({
			blocking: ['foreign_key_violation (3)'],
			waived: [],
			warnings: 189,
			infos: 1
		});
	});

	it('accepts only waivers scoped to the source and code, with a reason', () => {
		const waiver = { source: 'ttu', code: 'foreign_key_violation', reason: 'Upstream issue #12, stops unused by trips' };
		expect(validatorVerdict('ttu', notices, [waiver]).blocking).toEqual([]);
		expect(validatorVerdict('tte', notices, [waiver]).blocking).toHaveLength(1);
		expect(validatorVerdict('ttu', notices, [{ ...waiver, reason: ' ' }]).blocking).toHaveLength(1);
	});
});

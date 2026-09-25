import { describe, expect, it } from 'vitest';
import { summarize } from './outcome';

describe('summarize (C09)', () => {
	it('keeps the evaluated destination and marks the search partial on a timeout', () => {
		const s = summarize([
			{ destinationId: 'a', kind: 'evaluated', proposal: null },
			{ destinationId: 'b', kind: 'timeout' }
		]);
		expect(s).toMatchObject({
			status: 'partial',
			catalogCount: 2,
			evaluatedCount: 1,
			warnings: ['PARTIAL_TIMEOUT'],
			allFailed: false
		});
	});

	it('flags a search where every destination failed, so the API can answer 503', () => {
		const s = summarize([
			{ destinationId: 'a', kind: 'upstream_error' },
			{ destinationId: 'b', kind: 'timeout' }
		]);
		expect(s.allFailed).toBe(true);
		expect(s.warnings).toEqual(['PARTIAL_UPSTREAM_ERROR', 'PARTIAL_TIMEOUT']);
	});

	it('reports a complete empty result when everything was evaluated without proposals', () => {
		const s = summarize([{ destinationId: 'a', kind: 'evaluated', proposal: null }]);
		expect(s).toMatchObject({ status: 'complete', proposals: [], allFailed: false });
	});

	it('treats truncation as partial but an overdue data check only as a warning', () => {
		expect(
			summarize([{ destinationId: 'a', kind: 'evaluated', proposal: null, truncated: true }]).status
		).toBe('partial');
		const overdue = summarize([{ destinationId: 'a', kind: 'evaluated', proposal: null }], [
			'DATA_CHECK_OVERDUE'
		]);
		expect(overdue.status).toBe('complete');
		expect(overdue.warnings).toEqual(['DATA_CHECK_OVERDUE']);
	});
});

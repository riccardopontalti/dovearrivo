import { describe, expect, it } from 'vitest';
import { bandOf, countByBand } from './reach-bands';

describe('reachability bands', () => {
	it('puts band limits in the lower band and everything beyond 2 h in the last', () => {
		expect([0, 30, 31, 60, 90, 120, 121, 240].map(bandOf)).toEqual([0, 0, 1, 1, 2, 3, 4, 4]);
		expect(countByBand([{ minutes: 10 }, { minutes: 45 }, { minutes: 50 }, { minutes: 200 }])).toEqual([1, 2, 0, 0, 1]);
	});
});

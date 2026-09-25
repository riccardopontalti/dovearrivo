import { describe, expect, it } from 'vitest';
import { availableTo, decideRebuild, metricDrift, snapshotLimitations, timetableWindow } from './plan.ts';

const NIGHT = Date.parse('2026-09-26T02:00:00+02:00');

describe('timetableWindow', () => {
	it('imports yesterday to today + 30, 32 days, using the local day', () => {
		expect(timetableWindow(NIGHT)).toEqual({ firstDay: '2026-09-25', lastDay: '2026-10-26', numDays: 32 });
		// 23:30 UTC on 25/09 is already 26/09 in Rome.
		expect(timetableWindow(Date.parse('2026-09-25T23:30:00Z')).firstDay).toBe('2026-09-25');
	});
});

describe('decideRebuild (C11)', () => {
	const hashes = { tte: 'a', ttu: 'b', osm: 'o' };

	it('rolls the window on a new local day even when every feed is unchanged', () => {
		const active = { firstDay: '2026-09-24', sourceHashes: hashes };
		const d = decideRebuild(active, hashes, timetableWindow(NIGHT));
		expect(d.rebuild).toBe(true);
		expect(d.reasons).toEqual(['window moved to 2026-09-25']);
	});

	it('does nothing when the day and every source are unchanged', () => {
		const active = { firstDay: '2026-09-25', sourceHashes: hashes };
		expect(decideRebuild(active, hashes, timetableWindow(NIGHT)).rebuild).toBe(false);
	});

	it('rebuilds for a changed, added or removed source, or when forced', () => {
		const active = { firstDay: '2026-09-25', sourceHashes: hashes };
		const w = timetableWindow(NIGHT);
		expect(decideRebuild(active, { ...hashes, tte: 'new' }, w).reasons).toEqual(['source tte changed']);
		expect(decideRebuild(active, { ...hashes, trenitalia: 't' }, w).reasons).toEqual(['source trenitalia changed']);
		expect(decideRebuild(active, { tte: 'a', osm: 'o' }, w).reasons).toEqual(['source ttu removed']);
		expect(decideRebuild(active, hashes, w, true).reasons).toEqual(['forced']);
		expect(decideRebuild(null, hashes, w).rebuild).toBe(true);
	});
});

describe('availableTo', () => {
	it('stops at the end of the shortest source coverage', () => {
		const w = timetableWindow(NIGHT);
		expect(availableTo(w, ['2027-06-25', '2027-06-08'])).toBe('2026-10-26');
		expect(availableTo(w, ['2027-06-25', '2026-10-10', null])).toBe('2026-10-10');
	});
});

describe('metricDrift', () => {
	const m = (loc: number, txd: number) => ({ noLocations: loc, noTrips: 1, transportsXDays: txd });

	it('flags changes above 20% for review, not smaller ones', () => {
		expect(metricDrift({ tte: m(1000, 1000) }, { tte: m(1150, 850) })).toEqual([]);
		expect(metricDrift({ tte: m(1000, 1000) }, { tte: m(1000, 700) })).toEqual([
			'tte.transportsXDays 1000 -> 700 (30%)'
		]);
	});

	it('ignores datasets that did not exist before', () => {
		expect(metricDrift({}, { trenitalia: m(10, 10) })).toEqual([]);
	});
});

describe('snapshotLimitations', () => {
	it('names sources without a stated licence and an early coverage end', () => {
		const w = timetableWindow(NIGHT);
		const l = snapshotLimitations(
			[
				{ id: 'tte', publisher: 'Trentino Trasporti', license: 'CC-BY-2.5-IT', serviceTo: '2027-06-25' },
				{ id: 'trenitalia', publisher: 'Trenitalia', license: 'unstated', serviceTo: '2026-10-10' }
			],
			w,
			'2026-10-10'
		);
		expect(l).toEqual([
			'Scheduled timetables only; no real-time data.',
			'Trenitalia: licence not stated by the publisher; see NOTICE.',
			'Coverage ends on 2026-10-10 because trenitalia data end then.'
		]);
	});
});

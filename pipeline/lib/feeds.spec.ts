import { describe, expect, it } from 'vitest';
import { gtfsServiceRange, inspectGtfs, missingGtfsFiles, netexValidity, parseCsv } from './feeds.ts';

describe('parseCsv', () => {
	it('handles BOM, quotes, escaped quotes and CRLF', () => {
		const rows = parseCsv('﻿feed_publisher_name,feed_version\r\n"Trentino ""TT"", S.p.A.",20260910\r\n');
		expect(rows).toEqual([{ feed_publisher_name: 'Trentino "TT", S.p.A.', feed_version: '20260910' }]);
	});
});

describe('GTFS structure and coverage', () => {
	it('requires the core files and at least one calendar file', () => {
		expect(missingGtfsFiles(['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'calendar_dates.txt'])).toEqual([]);
		expect(missingGtfsFiles(['agency.txt', 'stops.txt'])).toEqual([
			'routes.txt',
			'trips.txt',
			'stop_times.txt',
			'calendar.txt or calendar_dates.txt'
		]);
	});

	it('extends the calendar range with added dates only', () => {
		const range = gtfsServiceRange(
			[{ start_date: '20260910', end_date: '20270625' }],
			[
				{ date: '20270701', exception_type: '1' },
				{ date: '20270801', exception_type: '2' }
			]
		);
		expect(range).toEqual({ from: '2026-09-10', to: '2027-07-01' });
	});

	it('accepts the synthetic fixture and reads its service range', () => {
		const report = inspectGtfs('research/synthetic-gtfs.zip', 10_000_000);
		expect(report).toMatchObject({ ok: true, serviceFrom: '2026-09-01', serviceTo: '2026-10-31' });
	});

	it('rejects a file that is not a ZIP', () => {
		expect(inspectGtfs('package.json', 10_000_000)).toMatchObject({ ok: false, problems: ['not a readable ZIP'] });
	});
});

describe('netexValidity', () => {
	it('reads the first ValidBetween of the publication', () => {
		const head = '<ValidBetween><FromDate>2026-05-23T00:00:00.000+02:00</FromDate><ToDate>2026-12-12T23:59:59.999+02:00</ToDate></ValidBetween>';
		expect(netexValidity(head)).toEqual({ from: '2026-05-23', to: '2026-12-12' });
	});
});

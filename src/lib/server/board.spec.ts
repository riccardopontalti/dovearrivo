import { describe, expect, it } from 'vitest';
import type { Destination, Proposal, SearchResponse } from '$lib/api/types';
import { journeyOf, leg, request } from '$lib/domain/fixtures';
import { boardOf, boardRequest, boardWindow, BOARD_ROWS } from './board';
import { TRENTO } from './bloom';

const DAY = '2026-09-26';

function proposal(id: string, out: [string, string], back: [string, string], backup?: [string, string]): Proposal {
	const j = ([s, e]: [string, string]) => journeyOf([leg('BUS', DAY, s, e)]);
	return {
		destinationId: id,
		outbound: j(out),
		inbound: j(back),
		...(backup ? { backupInbound: j(backup) } : {}),
		staySeconds: 3600,
		returnStatus: backup ? 'later_option_found' : 'no_later_option_found'
	};
}

function response(proposals: Proposal[]): SearchResponse {
	return {
		status: 'complete',
		dataVersion: 'v1',
		generatedAt: '2026-09-26T08:00:00+02:00',
		normalizedRequest: request(),
		catalogCount: proposals.length,
		evaluatedCount: proposals.length,
		warnings: [],
		proposals
	};
}

const dest = (id: string, name: string): Destination => ({
	id,
	name,
	category: 'lake',
	entrance: { lat: 46, lon: 11 },
	description: '',
	infoUrl: 'https://example.org',
	checkedAt: DAY
});

describe('boardWindow', () => {
	it('starts at the next whole hour and lasts up to ten hours', () => {
		expect(boardWindow(Date.parse('2026-09-26T07:10:00Z'))).toEqual({ date: DAY, start: '10:00', end: '20:00' });
	});

	it('never ends after 22:00, so the window stays inside the service hours', () => {
		expect(boardWindow(Date.parse('2026-09-26T15:30:00Z'))).toEqual({ date: DAY, start: '18:00', end: '22:00' });
	});

	it('moves to the next morning late in the evening', () => {
		expect(boardWindow(Date.parse('2026-09-26T19:30:00Z'))).toEqual({ date: '2026-09-27', start: '08:00', end: '18:00' });
	});
});

describe('boardRequest', () => {
	it('searches from the Trento coordinate with the board limits', () => {
		const r = boardRequest(TRENTO, { date: DAY, start: '10:00', end: '20:00' });
		expect(r.originPoint).toEqual(TRENTO.point);
		expect(r.departAfter).toBe('2026-09-26T10:00:00+02:00');
		expect(r.returnBy).toBe('2026-09-26T20:00:00+02:00');
		expect(r.minStayMinutes).toBe(60);
	});
});

describe('boardOf', () => {
	it('lists real proposals by departure time, with return and backup times', () => {
		const board = boardOf(
			TRENTO,
			{ date: DAY, start: '09:00', end: '19:00' },
			response([proposal('late', ['10:05', '10:40'], ['17:00', '17:35']), proposal('early', ['09:10', '09:45'], ['16:00', '16:30'], ['17:30', '18:00'])]),
			{ early: dest('early', 'Lago'), late: dest('late', 'Castello') }
		);
		expect(board.rows.map((r) => [r.name, r.depart, r.arrive, r.leave, r.home, r.backup])).toEqual([
			['Lago', '09:10', '09:45', '16:00', '16:30', '17:30'],
			['Castello', '10:05', '10:40', '17:00', '17:35', undefined]
		]);
	});

	it('keeps at most one board of rows', () => {
		const many = Array.from({ length: 12 }, (_, i) => proposal(`d${i}`, ['09:00', '09:30'], ['15:00', '15:30']));
		expect(boardOf(TRENTO, { date: DAY, start: '09:00', end: '19:00' }, response(many), {}).rows).toHaveLength(BOARD_ROWS);
	});
});

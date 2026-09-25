// Home page departures board: real trips with a way back from the showcase origin in the
// next hours, from the same search as the search page. Rows are sorted by departure like a
// station board. Nothing here is invented: an empty board says so.
import type { Destination, SearchRequest, SearchResponse } from '$lib/api/types';
import { formatInstant, localDate, localTime, localToMillis } from '$lib/domain/time';
import { clock } from '$lib/format';
import { bloomDeparture, type BloomOrigin } from './bloom';

export const BOARD_ROWS = 8;
export const BOARD_LIMITS = { maxJourneyMinutes: 90, minStayMinutes: 60, maxWalkMinutes: 15, maxTransfers: 1 } as const;

export interface BoardWindow {
	date: string;
	start: string;
	end: string;
}

export interface BoardRow {
	id: string;
	name: string;
	category: string;
	depart: string;
	arrive: string;
	/** Departure of the return from the destination. */
	leave: string;
	home: string;
	backup?: string;
}

export interface Board extends BoardWindow {
	origin: { name: string; from: string };
	dataVersion: string;
	partial: boolean;
	rows: BoardRow[];
	limits: typeof BOARD_LIMITS;
}

/** From the next whole hour (see bloomDeparture) for up to ten hours, ending by 22:00. */
export function boardWindow(now: number): BoardWindow {
	const departure = bloomDeparture(now);
	const date = localDate(departure);
	const start = localTime(departure).slice(0, 5);
	const startHour = Number(start.slice(0, 2));
	const endHour = Math.min(22, startHour + 10);
	return { date, start, end: `${String(endHour).padStart(2, '0')}:00` };
}

export function boardRequest(origin: BloomOrigin, window: BoardWindow): SearchRequest {
	const isPoint = origin.from.includes(',');
	return {
		...(isPoint ? { originPoint: origin.point, originName: origin.name } : { originStopId: origin.from }),
		departAfter: formatInstant(localToMillis(window.date, window.start)),
		returnBy: formatInstant(localToMillis(window.date, window.end)),
		...BOARD_LIMITS
	};
}

export function boardOf(origin: BloomOrigin, window: BoardWindow, response: SearchResponse, destinations: Record<string, Destination>): Board {
	const rows = response.proposals
		.map((p): BoardRow => {
			const d = destinations[p.destinationId];
			return {
				id: p.destinationId,
				name: d?.name ?? p.destinationId,
				category: d?.category ?? 'test',
				depart: clock(p.outbound.startTime),
				arrive: clock(p.outbound.endTime),
				leave: clock(p.inbound.startTime),
				home: clock(p.inbound.endTime),
				...(p.backupInbound ? { backup: clock(p.backupInbound.startTime) } : {})
			};
		})
		.sort((a, b) => a.depart.localeCompare(b.depart) || a.name.localeCompare(b.name))
		.slice(0, BOARD_ROWS);
	return {
		...window,
		origin: { name: origin.name, from: origin.from },
		dataVersion: response.dataVersion,
		partial: response.status === 'partial',
		rows,
		limits: BOARD_LIMITS
	};
}

// Day ribbon: the chosen day as a horizontal timeline with outbound, stay, return and the
// backup return. Positions are local clock minutes (Europe/Rome) from the midnight of the
// searched day, read from each instant's local time: on DST days a 09:00 departure stays
// at 09:00 on the ribbon even though ten real hours have passed since midnight.
import type { Proposal } from './api/types';
import { localDate, localTime } from './domain/time';

export type RibbonKind = 'outbound' | 'stay' | 'inbound' | 'backup';

export interface RibbonSegment {
	kind: RibbonKind;
	/** Local clock minutes from the searched day's midnight (can exceed 1440). */
	start: number;
	end: number;
	/** Left edge and width as percentages of the ribbon. */
	left: number;
	width: number;
}

export interface Ribbon {
	/** Whole hours shown, in minutes from midnight. */
	from: number;
	to: number;
	segments: RibbonSegment[];
	/** The user's window as positions on the ribbon. */
	windowStart: number;
	windowEnd: number;
	/** Hour marks, every hour or every two hours on long ribbons. */
	ticks: Array<{ minutes: number; at: number }>;
}

function clockMinutes(hhmm: string): number {
	const [h, m] = hhmm.split(':').map(Number);
	return h * 60 + m;
}

/** Local clock minutes of an instant from the midnight of `date`. */
export function minutesOfDay(instant: string, date: string): number {
	const dayOffset = Math.round((Date.parse(`${localDate(instant)}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
	return dayOffset * 1440 + clockMinutes(localTime(instant).slice(0, 5));
}

export function ribbonOf(proposal: Proposal, date: string, windowStart: string, windowEnd: string): Ribbon {
	const ws = clockMinutes(windowStart);
	const we = clockMinutes(windowEnd);
	const out = { start: minutesOfDay(proposal.outbound.startTime, date), end: minutesOfDay(proposal.outbound.endTime, date) };
	const back = { start: minutesOfDay(proposal.inbound.startTime, date), end: minutesOfDay(proposal.inbound.endTime, date) };
	const backup = proposal.backupInbound
		? { start: minutesOfDay(proposal.backupInbound.startTime, date), end: minutesOfDay(proposal.backupInbound.endTime, date) }
		: undefined;

	const from = Math.floor(Math.min(ws, out.start) / 60) * 60;
	const to = Math.ceil(Math.max(we, back.end, backup?.end ?? 0) / 60) * 60;
	const span = Math.max(60, to - from);
	const pct = (m: number) => ((m - from) / span) * 100;
	const segment = (kind: RibbonKind, s: number, e: number): RibbonSegment => ({
		kind,
		start: s,
		end: e,
		left: pct(s),
		width: Math.max(0, pct(e) - pct(s))
	});

	const segments = [segment('outbound', out.start, out.end), segment('stay', out.end, back.start), segment('inbound', back.start, back.end)];
	if (backup) segments.push(segment('backup', backup.start, backup.end));

	const step = span > 12 * 60 ? 120 : 60;
	const ticks: Ribbon['ticks'] = [];
	for (let m = from; m <= to; m += step) ticks.push({ minutes: m, at: pct(m) });

	return { from, to, segments, windowStart: pct(ws), windowEnd: pct(we), ticks };
}

/** "HH:MM" for local clock minutes, wrapping after midnight. */
export function clockLabel(minutes: number): string {
	const m = ((minutes % 1440) + 1440) % 1440;
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

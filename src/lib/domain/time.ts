// Time zone helpers. Instants are handled as epoch milliseconds or ISO strings with an
// explicit offset; local dates and times are always interpreted in an IANA time zone,
// never by adding hours to strings.

export const TIME_ZONE = 'Europe/Rome';

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
	let f = partsFormatters.get(timeZone);
	if (!f) {
		f = new Intl.DateTimeFormat('en-GB', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		partsFormatters.set(timeZone, f);
	}
	return f;
}

interface LocalParts {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
}

function localParts(ms: number, timeZone: string): LocalParts {
	const out: Record<string, number> = {};
	for (const p of formatter(timeZone).formatToParts(ms)) {
		if (p.type !== 'literal') out[p.type] = Number(p.value);
	}
	return out as unknown as LocalParts;
}

/** Offset of the time zone from UTC at the given instant, in minutes (e.g. +120). */
export function offsetMinutes(ms: number, timeZone = TIME_ZONE): number {
	const p = localParts(ms, timeZone);
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

export function toMillis(instant: string | number): number {
	const ms = typeof instant === 'number' ? instant : Date.parse(instant);
	if (Number.isNaN(ms)) throw new RangeError(`Invalid instant: ${String(instant)}`);
	return ms;
}

/** Local calendar date (YYYY-MM-DD) of an instant in the time zone. */
export function localDate(instant: string | number, timeZone = TIME_ZONE): string {
	const p = localParts(toMillis(instant), timeZone);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Local wall-clock time (HH:MM:SS) of an instant in the time zone. */
export function localTime(instant: string | number, timeZone = TIME_ZONE): string {
	const p = localParts(toMillis(instant), timeZone);
	return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

/**
 * Instant of a local date and wall-clock time in the time zone. For times skipped by a
 * DST change the result falls after the gap; for repeated times the earlier one is used.
 */
export function localToMillis(date: string, time: string, timeZone = TIME_ZONE): number {
	const [y, mo, d] = date.split('-').map(Number);
	const [h, mi, s = 0] = time.split(':').map(Number);
	const wall = Date.UTC(y, mo - 1, d, h, mi, s);
	// The offsets one day before and after cover both sides of any DST change.
	const candidates = [
		wall - offsetMinutes(wall - DAY_MS, timeZone) * 60_000,
		wall - offsetMinutes(wall + DAY_MS, timeZone) * 60_000
	];
	const matching = candidates.filter((c) => {
		const p = localParts(c, timeZone);
		return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === wall;
	});
	return matching.length > 0 ? Math.min(...matching) : Math.max(...candidates);
}

const DAY_MS = 86_400_000;

/** ISO 8601 string with the local offset of the time zone, e.g. 2026-09-26T09:00:00+02:00. */
export function formatInstant(ms: number, timeZone = TIME_ZONE): string {
	const offset = offsetMinutes(ms, timeZone);
	const sign = offset < 0 ? '-' : '+';
	const abs = Math.abs(offset);
	return `${localDate(ms, timeZone)}T${localTime(ms, timeZone)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Adds whole calendar days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
	const [y, m, d] = date.split('-').map(Number);
	const next = new Date(Date.UTC(y, m - 1, d + days));
	return next.toISOString().slice(0, 10);
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

// Display helpers shared by server and client. Instants are shown in Europe/Rome.
import type { Messages } from './i18n';
import { localDate, localTime } from './domain/time';

export function clock(instant: string): string {
	return localTime(instant).slice(0, 5);
}

export function duration(seconds: number, t: Messages): string {
	const minutes = Math.round(seconds / 60);
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m} ${t.minutes}`;
	return m === 0 ? `${h} ${t.hours}` : `${h} ${t.hours} ${String(m).padStart(2, '0')} ${t.minutes}`;
}

/** Human date for a YYYY-MM-DD local date. */
export function longDate(date: string, locale: 'it' | 'en'): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	}).format(Date.UTC(y, m - 1, d));
}

const RAIL = /RAIL|SUBWAY|METRO/;

export function modeLabel(mode: string, t: Messages): string {
	if (mode === 'WALK') return t.modeWalk;
	if (mode === 'BUS' || mode === 'COACH') return t.modeBus;
	if (RAIL.test(mode)) return t.modeRail;
	if (mode === 'TRAM') return t.modeTram;
	if (mode === 'AERIAL_LIFT') return t.modeCable;
	if (mode === 'FUNICULAR') return t.modeFunicular;
	if (mode === 'FERRY') return t.modeFerry;
	return t.modeOther;
}

export function feedLabel(feedId: string, t: Messages): string {
	const key = `feed_${feedId}` as keyof Messages;
	return key in t ? t[key] : t.feed_other;
}

export { localDate };

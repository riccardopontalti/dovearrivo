// The search form lives in the URL, so every search can be shared and works without
// JavaScript. Values outside the allowed options fall back to the defaults.
import type { SearchRequest } from './api/types';
import { addDays, formatInstant, localToMillis } from './domain/time';

export const OPTIONS = {
	maxJourneyMinutes: [30, 45, 60, 90, 120, 150, 180],
	minStayMinutes: [30, 60, 90, 120, 180, 240, 300, 360, 480],
	maxWalkMinutes: [5, 10, 15, 20, 25, 30],
	maxTransfers: [0, 1, 2]
} as const;

type Limit = keyof typeof OPTIONS;

export interface SearchForm {
	from: string;
	fromQuery: string;
	date: string;
	start: string;
	end: string;
	maxJourneyMinutes: number;
	minStayMinutes: number;
	maxWalkMinutes: number;
	maxTransfers: number;
}

/** Tomorrow when it is covered, otherwise the first covered day; 09:00–19:00. */
export function defaultForm(today: string, availableFrom: string | null, availableTo: string | null): SearchForm {
	const tomorrow = addDays(today, 1);
	let date = tomorrow;
	if (availableFrom && availableTo && (tomorrow < availableFrom || tomorrow > availableTo)) {
		date = availableFrom > today ? availableFrom : today;
	}
	return {
		from: '',
		fromQuery: '',
		date,
		start: '09:00',
		end: '19:00',
		maxJourneyMinutes: 90,
		minStayMinutes: 120,
		maxWalkMinutes: 20,
		maxTransfers: 1
	};
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COORDINATE = /^(-?\d{1,2}(?:\.\d{1,7})?),(-?\d{1,3}(?:\.\d{1,7})?)$/;

/** `from` holds a stop id or "lat,lon" for an address or place. */
export function parseFrom(from: string): { stopId: string } | { point: { lat: number; lon: number } } {
	const m = COORDINATE.exec(from);
	return m ? { point: { lat: Number(m[1]), lon: Number(m[2]) } } : { stopId: from };
}

export function coordinateFrom(point: { lat: number; lon: number }): string {
	return `${Number(point.lat.toFixed(7))},${Number(point.lon.toFixed(7))}`;
}
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function readForm(params: URLSearchParams, defaults: SearchForm): SearchForm {
	const text = (key: string, max: number) => (params.get(key) ?? '').trim().slice(0, max);
	const pick = (key: Limit): number => {
		const value = Number(params.get(key));
		return params.has(key) && (OPTIONS[key] as readonly number[]).includes(value) ? value : defaults[key];
	};
	const date = text('date', 10);
	const start = text('start', 5);
	const end = text('end', 5);
	return {
		from: text('from', 200),
		fromQuery: text('fromQuery', 80),
		date: DATE.test(date) ? date : defaults.date,
		start: TIME.test(start) ? start : defaults.start,
		end: TIME.test(end) ? end : defaults.end,
		maxJourneyMinutes: pick('maxJourneyMinutes'),
		minStayMinutes: pick('minStayMinutes'),
		maxWalkMinutes: pick('maxWalkMinutes'),
		maxTransfers: pick('maxTransfers')
	};
}

export function toRequest(form: SearchForm, from: string): SearchRequest {
	const origin = parseFrom(from);
	return {
		...('point' in origin
			? { originPoint: origin.point, ...(form.fromQuery ? { originName: form.fromQuery.slice(0, 80) } : {}) }
			: { originStopId: origin.stopId }),
		departAfter: formatInstant(localToMillis(form.date, form.start)),
		returnBy: formatInstant(localToMillis(form.date, form.end)),
		maxJourneyMinutes: form.maxJourneyMinutes,
		minStayMinutes: form.minStayMinutes,
		maxWalkMinutes: form.maxWalkMinutes,
		maxTransfers: form.maxTransfers
	};
}

export function toParams(form: SearchForm, lang?: string): URLSearchParams {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(form)) p.set(k, String(v));
	if (lang) p.set('lang', lang);
	return p;
}

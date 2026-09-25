// Data for the home page "bloom": stops reachable from a fixed origin within 90 minutes,
// replayed in arrival order. Real one-to-all results, rounded and deduplicated so the
// payload stays small on phones, and cached per departure hour so page views do not hit
// the engine.
import type { Reachability } from '$lib/api/types';
import { addDays, formatInstant, localDate, localTime, localToMillis } from '$lib/domain/time';

export const BLOOM_MINUTES = 90;

export interface BloomOrigin {
	/** Stop id or "lat,lon", as accepted by the reachability backend. */
	from: string;
	name: string;
	point: { lat: number; lon: number };
}

/** Trento railway station forecourt (Piazza Dante); the walk to nearby stops is part of the query. */
export const TRENTO: BloomOrigin = { from: '46.0719,11.1194', name: 'Trento', point: { lat: 46.0719, lon: 11.1194 } };

export interface Bloom {
	origin: BloomOrigin;
	departAfter: string;
	minutes: number;
	dataVersion: string;
	/** Flat [lon, lat, minutes, ...], nearest first. */
	points: number[];
}

/**
 * Departure shown on the home page: the next whole hour today between 07:00 and 19:00,
 * otherwise 08:00 of the next morning. A bloom at night would be nearly empty.
 */
export function bloomDeparture(now: number): string {
	const today = localDate(now);
	const [h, m] = localTime(now).split(':').map(Number);
	const next = m === 0 ? h : h + 1;
	if (next < 7) return formatInstant(localToMillis(today, '08:00'));
	if (next > 19) return formatInstant(localToMillis(addDays(today, 1), '08:00'));
	return formatInstant(localToMillis(today, `${String(next).padStart(2, '0')}:00`));
}

/** Rounds to about 10 m and keeps the earliest arrival per point. */
export function bloomOf(origin: BloomOrigin, result: Reachability): Bloom {
	const best = new Map<string, [number, number, number]>();
	for (const p of result.places) {
		const lon = Math.round(p.point.lon * 1e4) / 1e4;
		const lat = Math.round(p.point.lat * 1e4) / 1e4;
		const key = `${lon},${lat}`;
		const seen = best.get(key);
		if (!seen || p.minutes < seen[2]) best.set(key, [lon, lat, p.minutes]);
	}
	const points = [...best.values()].sort((a, b) => a[2] - b[2]).flat();
	return { origin, departAfter: result.departAfter, minutes: result.minutes, dataVersion: result.dataVersion, points };
}

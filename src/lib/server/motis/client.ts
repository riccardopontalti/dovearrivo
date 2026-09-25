// HTTP access to the private MOTIS instance, with per-call timeouts.
import type { MotisPlanResponse } from './normalize';
import { CALL_TIMEOUT_SECONDS } from './params';

export class MotisError extends Error {
	constructor(
		readonly kind: 'timeout' | 'http' | 'network',
		message: string,
		readonly status: number | null = null
	) {
		super(message);
	}

	/** MOTIS answers 404 with this text when a stop id is not in the timetable. */
	get unknownLocation(): boolean {
		return this.status === 404 && /timetable location/i.test(this.message);
	}
}

export interface GeocodeMatch {
	type: string;
	id?: string;
	name: string;
	lat: number;
	lon: number;
	houseNumber?: string;
	street?: string;
	areas?: Array<{ name: string; adminLevel: number; default?: boolean }>;
}

export interface MotisReachable {
	all: Array<{ place: { name: string; lat: number; lon: number; stopId?: string }; duration: number; k: number }>;
}

export interface MotisClient {
	oneToAll(query: URLSearchParams, signal?: AbortSignal): Promise<MotisReachable>;
	plan(query: URLSearchParams, signal?: AbortSignal): Promise<MotisPlanResponse>;
	/** `type` limits results to STOP, ADDRESS or PLACE; all types when omitted. */
	geocode(text: string, type?: 'STOP', signal?: AbortSignal): Promise<GeocodeMatch[]>;
}

// The engine enforces its own timeout; the client allows a small margin on top.
const CLIENT_TIMEOUT_MS = CALL_TIMEOUT_SECONDS * 1000 + 500;

export function createMotisClient(baseUrl: string, fetchFn: typeof fetch = fetch): MotisClient {
	async function get<T>(path: string, query: URLSearchParams, signal?: AbortSignal): Promise<T> {
		const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
		const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
		let response: Response;
		try {
			response = await fetchFn(`${baseUrl}${path}?${query}`, { signal: combined });
		} catch (error) {
			if (combined.aborted) throw new MotisError('timeout', 'MOTIS call aborted or timed out');
			throw new MotisError('network', error instanceof Error ? error.message : 'Network error');
		}
		if (!response.ok) {
			let message = `HTTP ${response.status}`;
			try {
				const body = (await response.json()) as { error?: string };
				if (body.error) message = body.error;
			} catch {
				// Non-JSON error body: keep the status line.
			}
			throw new MotisError('http', message, response.status);
		}
		return (await response.json()) as T;
	}

	return {
		plan: (query, signal) => get<MotisPlanResponse>('/api/v6/plan', query, signal),
		oneToAll: (query, signal) => get<MotisReachable>('/api/v6/one-to-all', query, signal),
		geocode: (text, type, signal) =>
			get<GeocodeMatch[]>(
				'/api/v1/geocode',
				new URLSearchParams({ text, language: 'it', ...(type ? { type } : {}) }),
				signal
			)
	};
}

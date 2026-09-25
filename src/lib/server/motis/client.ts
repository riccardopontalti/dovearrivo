// HTTP access to the private MOTIS instance, with per-call timeouts.
//
// MOTIS v2.11.3 answers with HTTP/1.1 bodies delimited by closing the connection (no
// Content-Length, no chunked encoding). Node's fetch (undici) can crash the whole process
// on such responses under load ("assert(!this.paused)"), so this client uses node:http and
// reads the full body into memory, with a size cap, before parsing it.
import { request as httpRequest } from 'node:http';
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
/** A plan page with 64 itineraries and geometries is about 0.5 MB; 32 MB is a hard stop. */
const MAX_BODY_BYTES = 32 * 1024 * 1024;

function httpGet(url: string, signal: AbortSignal): Promise<{ status: number; body: Buffer }> {
	return new Promise((resolve, reject) => {
		const req = httpRequest(url, { method: 'GET', signal }, (res) => {
			const chunks: Buffer[] = [];
			let size = 0;
			res.on('data', (chunk: Buffer) => {
				size += chunk.length;
				if (size > MAX_BODY_BYTES) {
					req.destroy(new Error('MOTIS response too large'));
					return;
				}
				chunks.push(chunk);
			});
			res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
			res.on('error', reject);
		});
		req.on('error', reject);
		req.end();
	});
}

export function createMotisClient(baseUrl: string): MotisClient {
	async function get<T>(path: string, query: URLSearchParams, signal?: AbortSignal): Promise<T> {
		const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
		const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
		let response: { status: number; body: Buffer };
		try {
			response = await httpGet(`${baseUrl}${path}?${query}`, combined);
		} catch (error) {
			if (combined.aborted) throw new MotisError('timeout', 'MOTIS call aborted or timed out');
			throw new MotisError('network', error instanceof Error ? error.message : 'Network error');
		}
		const text = response.body.toString('utf8');
		if (response.status < 200 || response.status >= 300) {
			let message = `HTTP ${response.status}`;
			try {
				const body = JSON.parse(text) as { error?: string };
				if (body.error) message = body.error;
			} catch {
				// Non-JSON error body: keep the status line.
			}
			throw new MotisError('http', message, response.status);
		}
		try {
			return JSON.parse(text) as T;
		} catch {
			throw new MotisError('network', 'MOTIS returned invalid JSON');
		}
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

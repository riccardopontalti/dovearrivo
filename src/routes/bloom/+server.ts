// Home page bloom (see $lib/server/bloom). Not part of the public API contract: it serves
// the page only and may change with the design.
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { backend } from '$lib/server/backend';
import { BLOOM_MINUTES, bloomDeparture, bloomOf, TRENTO, type Bloom, type BloomOrigin } from '$lib/server/bloom';
import { LruCache } from '$lib/server/cache';
import { ApiError } from '$lib/server/errors';
import type { RequestHandler } from './$types';

const cache = new LruCache<Bloom>(4_000_000, 30 * 60_000);
const pending = new Map<string, Promise<Bloom | null>>();

// The mock backend only knows its synthetic stop A.
const origin = (): BloomOrigin =>
	(env.DOVEARRIVO_BACKEND ?? 'mock') === 'motis'
		? TRENTO
		: { from: 'syn_A', name: 'Origine sintetica A', point: { lat: 46.0, lon: 11.0 } };

async function compute(departAfter: string): Promise<Bloom | null> {
	const o = origin();
	try {
		const result = await backend().reachability({ from: o.from, departAfter, minutes: BLOOM_MINUTES, maxTransfers: 1, maxWalkMinutes: 15 });
		const bloom = bloomOf(o, result);
		cache.set(departAfter, bloom, bloom.points.length * 24 + 500);
		return bloom;
	} catch (error) {
		// No data for that day or engine down: the page keeps its illustration.
		if (error instanceof ApiError) return null;
		throw error;
	}
}

export const GET: RequestHandler = async () => {
	const departAfter = bloomDeparture(Date.now());
	let bloom: Bloom | null | undefined = cache.get(departAfter);
	if (!bloom) {
		let job = pending.get(departAfter);
		if (!job) {
			job = compute(departAfter).finally(() => pending.delete(departAfter));
			pending.set(departAfter, job);
		}
		bloom = await job;
	}
	return json(bloom ?? { unavailable: true }, { headers: { 'cache-control': 'public, max-age=300' } });
};

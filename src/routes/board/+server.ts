// Home page departures board (see $lib/server/board). Not part of the public API contract:
// it serves the page only and may change with the design.
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { localeFromUrl } from '$lib/i18n';
import { backend } from '$lib/server/backend';
import { showcaseOrigin } from '$lib/server/bloom';
import { boardOf, boardRequest, boardWindow, type Board } from '$lib/server/board';
import { LruCache } from '$lib/server/cache';
import { ApiError } from '$lib/server/errors';
import { executeSearch } from '$lib/server/search';
import type { RequestHandler } from './$types';

const cache = new LruCache<Board>(1_000_000, 30 * 60_000);
const pending = new Map<string, Promise<Board | null>>();

async function compute(key: string, locale: 'it' | 'en', now: number): Promise<Board | null> {
	const origin = showcaseOrigin(env.DOVEARRIVO_BACKEND);
	const window = boardWindow(now);
	try {
		const [response, destinations] = await Promise.all([
			executeSearch(boardRequest(origin, window), now),
			backend().listDestinations(locale)
		]);
		const board = boardOf(origin, window, response, Object.fromEntries(destinations.map((d) => [d.id, d])));
		// A partial answer is shown but not kept: the next visitor gets a fresh attempt.
		if (!board.partial) cache.set(key, board, 4000);
		return board;
	} catch (error) {
		if (error instanceof ApiError) return null;
		throw error;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const locale = localeFromUrl(url);
	const now = Date.now();
	const window = boardWindow(now);
	const key = `${locale}:${window.date}T${window.start}`;
	let board: Board | null | undefined = cache.get(key);
	if (!board) {
		let job = pending.get(key);
		if (!job) {
			job = compute(key, locale, now).finally(() => pending.delete(key));
			pending.set(key, job);
		}
		board = await job;
	}
	return json(board ?? { unavailable: true, ...window }, { headers: { 'cache-control': 'public, max-age=120' } });
};

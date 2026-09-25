import { json } from '@sveltejs/kit';
import { readJson, withProblems } from '$lib/server/errors';
import { executeSearch } from '$lib/server/search';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) =>
	withProblems(async () => {
		const response = await executeSearch(await readJson(request), Date.now());
		return json(response, { headers: { 'cache-control': 'no-store' } });
	});

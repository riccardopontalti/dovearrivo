import { json } from '@sveltejs/kit';
import { readJson, withProblems } from '$lib/server/errors';
import { admission } from '$lib/server/ratelimit';
import { executeSearch } from '$lib/server/search';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request, getClientAddress }) =>
	withProblems(async () => {
		const body = await readJson(request);
		const response = await admission.run(getClientAddress(), () => executeSearch(body, Date.now()));
		return json(response, { headers: { 'cache-control': 'no-store' } });
	});

import { json } from '@sveltejs/kit';
import { applyDefaults } from '$lib/api/defaults';
import type { SearchRequest } from '$lib/api/types';
import { validate } from '$lib/api/validate';
import { windowProblem } from '$lib/domain/request';
import { backend } from '$lib/server/backend';
import { ApiError, readJson, withProblems } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ request }) =>
	withProblems(async () => {
		const body = await readJson(request);
		const valid = validate('SearchRequest', body);
		if (!valid.ok) throw new ApiError(400, 'INVALID_REQUEST', valid.message);

		const normalized = applyDefaults(body as SearchRequest);
		const problem = windowProblem(normalized, Date.now());
		if (problem) throw new ApiError(400, 'INVALID_REQUEST', problem);

		const response = await backend().search(normalized);
		return json(response, { headers: { 'cache-control': 'no-store' } });
	});

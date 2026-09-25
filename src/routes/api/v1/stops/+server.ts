import { json } from '@sveltejs/kit';
import { backend } from '$lib/server/backend';
import { ApiError, withProblems } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	withProblems(async () => {
		const q = url.searchParams.get('q')?.trim() ?? '';
		if (q.length < 2 || q.length > 80) {
			throw new ApiError(400, 'INVALID_REQUEST', 'q must be between 2 and 80 characters');
		}
		return json(await backend().findStops(q));
	});

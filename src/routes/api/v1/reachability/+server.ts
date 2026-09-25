import { json } from '@sveltejs/kit';
import { backend } from '$lib/server/backend';
import { withProblems } from '$lib/server/errors';
import { admission } from '$lib/server/ratelimit';
import { parseReachability } from '$lib/server/reachability';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, getClientAddress }) =>
	withProblems(async () => {
		const request = parseReachability(url.searchParams);
		return json(await admission.run(getClientAddress(), () => backend().reachability(request)));
	});

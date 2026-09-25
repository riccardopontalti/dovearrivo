import { json } from '@sveltejs/kit';
import { backend } from '$lib/server/backend';
import { withProblems } from '$lib/server/errors';
import { parseReachability } from '$lib/server/reachability';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	withProblems(async () => json(await backend().reachability(parseReachability(url.searchParams))));

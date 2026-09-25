import { json } from '@sveltejs/kit';
import { backend } from '$lib/server/backend';
import { withProblems } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	withProblems(async () => json(await backend().dataStatus()));

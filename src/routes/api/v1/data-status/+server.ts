import { json } from '@sveltejs/kit';
import { localeFromUrl } from '$lib/i18n';
import { backend } from '$lib/server/backend';
import { withProblems } from '$lib/server/errors';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	withProblems(async () => json(await backend().dataStatus(localeFromUrl(url))));

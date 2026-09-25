import { localeFromUrl } from '$lib/i18n';
import { backend } from '$lib/server/backend';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	locale: localeFromUrl(url),
	status: await backend().dataStatus()
});

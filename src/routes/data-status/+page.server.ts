import { localeFromUrl } from '$lib/i18n';
import { backend } from '$lib/server/backend';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const locale = localeFromUrl(url);
	return { locale, status: await backend().dataStatus(locale) };
};

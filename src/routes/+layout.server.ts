import { env } from '$env/dynamic/private';
import { localeFromUrl } from '$lib/i18n';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url }) => ({
	preview: env.DOVEARRIVO_PREVIEW === 'true',
	layoutLocale: localeFromUrl(url)
});

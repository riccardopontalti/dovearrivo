import type { Handle } from '@sveltejs/kit';
import { localeFromUrl } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const locale = localeFromUrl(event.url);
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};

import type { Handle } from '@sveltejs/kit';
import { defaultLocale, isLocale } from '$lib/i18n';

export const handle: Handle = async ({ event, resolve }) => {
	const requested = event.url.searchParams.get('lang');
	const locale = isLocale(requested) ? requested : defaultLocale;
	event.locals.locale = locale;
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
};

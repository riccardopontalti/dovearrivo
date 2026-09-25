import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { localeFromUrl } from '$lib/i18n';

const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'geolocation=(), camera=(), microphone=(), payment=()',
	'cross-origin-opener-policy': 'same-origin'
};

export const handle: Handle = async ({ event, resolve }) => {
	const locale = localeFromUrl(event.url);
	event.locals.locale = locale;
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale)
	});
	// A preview deployment shows unverified drafts: keep it out of search engines.
	if (env.DOVEARRIVO_PREVIEW === 'true') response.headers.set('x-robots-tag', 'noindex, nofollow');
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!response.headers.has(name)) response.headers.set(name, value);
	}
	return response;
};

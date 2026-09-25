import { messages } from '$lib/i18n';
import { backend } from '$lib/server/backend';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	locale: locals.locale,
	t: messages(locals.locale),
	dataStatus: await backend().dataStatus()
});

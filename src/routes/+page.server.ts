import type { PlaceMatch } from '$lib/api/types';
import { localDate } from '$lib/domain/time';
import { localeFromUrl } from '$lib/i18n';
import { defaultForm, readForm, toRequest } from '$lib/search-form';
import { backend } from '$lib/server/backend';
import { ApiError } from '$lib/server/errors';
import { resolveOrigin } from '$lib/server/origin';
import { admission } from '$lib/server/ratelimit';
import { executeSearch, WindowError } from '$lib/server/search';
import type { PageServerLoad } from './$types';

export type SearchOutcome =
	| { kind: 'results'; response: Awaited<ReturnType<typeof executeSearch>> }
	| { kind: 'chooseStop'; places: PlaceMatch[] }
	| { kind: 'error'; error: string };

export const load: PageServerLoad = async ({ url, getClientAddress }) => {
	const locale = localeFromUrl(url);
	const [status, destinations] = await Promise.all([backend().dataStatus(locale), backend().listDestinations(locale)]);
	const defaults = defaultForm(localDate(Date.now()), status.availableFrom, status.availableTo);
	const form = readForm(url.searchParams, defaults);
	const base = {
		locale,
		status,
		destinations: Object.fromEntries(destinations.map((d) => [d.id, d])),
		mock: status.dataVersion?.startsWith('mock') ?? false,
		form
	};
	if (!url.searchParams.has('from') && !url.searchParams.has('fromQuery')) {
		return { ...base, outcome: null as SearchOutcome | null };
	}

	const resolved = await resolveOrigin(form);
	if ('error' in resolved) return { ...base, outcome: { kind: 'error', error: resolved.error } as SearchOutcome };
	if ('choose' in resolved) return { ...base, outcome: { kind: 'chooseStop', places: resolved.choose } as SearchOutcome };
	const from = resolved.from;

	try {
		const response = await admission.run(getClientAddress(), () => executeSearch(toRequest(form, from), Date.now()));
		return { ...base, outcome: { kind: 'results', response } as SearchOutcome };
	} catch (error) {
		if (error instanceof WindowError) {
			const key = `err${error.problem[0].toUpperCase()}${error.problem.slice(1)}`;
			return { ...base, outcome: { kind: 'error', error: key } as SearchOutcome };
		}
		if (error instanceof ApiError) {
			const byCode: Record<string, string> = {
				UNKNOWN_ORIGIN: 'errUnknownOrigin',
				ORIGIN_NOT_COVERED: 'errOriginNotCovered',
				DATE_NOT_COVERED: 'errDateNotCovered',
				DATA_UNAVAILABLE: 'errDataUnavailable',
				ROUTING_UNAVAILABLE: 'errRoutingUnavailable',
				RATE_LIMITED: 'errRateLimited'
			};
			return { ...base, outcome: { kind: 'error', error: byCode[error.code] ?? 'errInvalid' } as SearchOutcome };
		}
		throw error;
	}
};

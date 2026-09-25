import type { PlaceMatch } from '$lib/api/types';
import { localDate } from '$lib/domain/time';
import { localeFromUrl } from '$lib/i18n';
import { coordinateFrom, defaultForm, readForm, toRequest } from '$lib/search-form';
import { backend } from '$lib/server/backend';
import { ApiError } from '$lib/server/errors';
import { executeSearch, WindowError } from '$lib/server/search';
import type { PageServerLoad } from './$types';

export type SearchOutcome =
	| { kind: 'results'; response: Awaited<ReturnType<typeof executeSearch>> }
	| { kind: 'chooseStop'; places: PlaceMatch[] }
	| { kind: 'error'; error: string };

export const load: PageServerLoad = async ({ url }) => {
	const [status, destinations] = await Promise.all([backend().dataStatus(), backend().listDestinations()]);
	const defaults = defaultForm(localDate(Date.now()), status.availableFrom, status.availableTo);
	const form = readForm(url.searchParams, defaults);
	const base = {
		locale: localeFromUrl(url),
		status,
		destinations: Object.fromEntries(destinations.map((d) => [d.id, d])),
		mock: status.dataVersion?.startsWith('mock') ?? false,
		form
	};
	if (!url.searchParams.has('from') && !url.searchParams.has('fromQuery')) {
		return { ...base, outcome: null as SearchOutcome | null };
	}

	let from = form.from;
	if (!from) {
		// Without JavaScript the place is typed, not picked: resolve it on the server.
		if (form.fromQuery.length < 2) return { ...base, outcome: { kind: 'error', error: 'errFromMissing' } as SearchOutcome };
		const places = await backend().findPlaces(form.fromQuery);
		if (places.length !== 1) return { ...base, outcome: { kind: 'chooseStop', places } as SearchOutcome };
		from = places[0].stopId ?? coordinateFrom(places[0].point);
		form.from = from;
		form.fromQuery = places[0].name;
	}

	try {
		const response = await executeSearch(toRequest(form, from), Date.now());
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
				ROUTING_UNAVAILABLE: 'errRoutingUnavailable'
			};
			return { ...base, outcome: { kind: 'error', error: byCode[error.code] ?? 'errInvalid' } as SearchOutcome };
		}
		throw error;
	}
};

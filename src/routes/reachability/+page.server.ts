import type { PlaceMatch, Reachability } from '$lib/api/types';
import { formatInstant, localDate, localToMillis } from '$lib/domain/time';
import { localeFromUrl } from '$lib/i18n';
import { defaultForm, readForm } from '$lib/search-form';
import { backend } from '$lib/server/backend';
import { ApiError } from '$lib/server/errors';
import { resolveOrigin } from '$lib/server/origin';
import type { PageServerLoad } from './$types';

const MINUTES = [30, 60, 90, 120, 180, 240] as const;

export type ReachOutcome =
	| { kind: 'result'; result: Reachability }
	| { kind: 'chooseStop'; places: PlaceMatch[] }
	| { kind: 'error'; error: string };

export const load: PageServerLoad = async ({ url }) => {
	const locale = localeFromUrl(url);
	const status = await backend().dataStatus(locale);
	const form = readForm(url.searchParams, defaultForm(localDate(Date.now()), status.availableFrom, status.availableTo));
	const requested = Number(url.searchParams.get('minutes'));
	const minutes = (MINUTES as readonly number[]).includes(requested) ? requested : 90;
	const base = { locale, status, form, minutes, minuteOptions: [...MINUTES] };
	if (!url.searchParams.has('from') && !url.searchParams.has('fromQuery')) return { ...base, outcome: null as ReachOutcome | null };

	const resolved = await resolveOrigin(form);
	if ('error' in resolved) return { ...base, outcome: { kind: 'error', error: resolved.error } as ReachOutcome };
	if ('choose' in resolved) return { ...base, outcome: { kind: 'chooseStop', places: resolved.choose } as ReachOutcome };
	try {
		const result = await backend().reachability({
			from: resolved.from,
			departAfter: formatInstant(localToMillis(form.date, form.start)),
			minutes,
			maxTransfers: form.maxTransfers,
			maxWalkMinutes: form.maxWalkMinutes
		});
		return { ...base, outcome: { kind: 'result', result } as ReachOutcome };
	} catch (error) {
		if (!(error instanceof ApiError)) throw error;
		const byCode: Record<string, string> = {
			UNKNOWN_ORIGIN: 'errUnknownOrigin',
			ORIGIN_NOT_COVERED: 'errOriginNotCovered',
			DATE_NOT_COVERED: 'errDateNotCovered',
			DATA_UNAVAILABLE: 'errDataUnavailable',
			ROUTING_UNAVAILABLE: 'errRoutingUnavailable'
		};
		return { ...base, outcome: { kind: 'error', error: byCode[error.code] ?? 'errInvalid' } as ReachOutcome };
	}
};

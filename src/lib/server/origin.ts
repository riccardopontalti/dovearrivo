// Resolves the `from` of a form: a picked stop or point, or (without JavaScript) a typed
// name looked up on the server.
import type { PlaceMatch } from '$lib/api/types';
import { coordinateFrom, type SearchForm } from '$lib/search-form';
import { backend } from './backend';

export type ResolvedOrigin = { from: string } | { choose: PlaceMatch[] } | { error: 'errFromMissing' };

export async function resolveOrigin(form: SearchForm): Promise<ResolvedOrigin> {
	if (form.from) return { from: form.from };
	if (form.fromQuery.length < 2) return { error: 'errFromMissing' };
	const places = await backend().findPlaces(form.fromQuery);
	if (places.length !== 1) return { choose: places };
	form.from = places[0].stopId ?? coordinateFrom(places[0].point);
	form.fromQuery = places[0].name;
	return { from: form.from };
}

// Shared entry point for searches from the public API and from the search page.
import { applyDefaults } from '$lib/api/defaults';
import type { SearchRequest, SearchResponse } from '$lib/api/types';
import { validate } from '$lib/api/validate';
import { windowProblem, windowProblemMessages, type WindowProblem } from '$lib/domain/request';
import { backend } from './backend';
import { ApiError } from './errors';

export class WindowError extends ApiError {
	readonly problem: WindowProblem;

	constructor(problem: WindowProblem) {
		super(400, 'INVALID_REQUEST', windowProblemMessages[problem]);
		this.problem = problem;
	}
}

/** Validates an untrusted request body and runs the search; throws ApiError on problems. */
export async function executeSearch(body: unknown, nowMs: number): Promise<SearchResponse> {
	const valid = validate('SearchRequest', body);
	if (!valid.ok) throw new ApiError(400, 'INVALID_REQUEST', valid.message);

	const normalized = applyDefaults(body as SearchRequest);
	const problem = windowProblem(normalized, nowMs);
	if (problem) throw new WindowError(problem);

	return backend().search(normalized);
}

// Validation of reachability preview parameters (limits from spec/api.openapi.yaml).
import type { ReachabilityRequest } from '$lib/api/types';
import { ApiError } from './errors';

function integer(params: URLSearchParams, key: string, min: number, max: number, fallback?: number): number {
	const raw = params.get(key);
	if (raw === null && fallback !== undefined) return fallback;
	const value = Number(raw);
	if (!Number.isInteger(value) || value < min || value > max) {
		throw new ApiError(400, 'INVALID_REQUEST', `${key} must be an integer between ${min} and ${max}`);
	}
	return value;
}

export function parseReachability(params: URLSearchParams): ReachabilityRequest {
	const from = (params.get('from') ?? '').trim();
	if (from.length < 1 || from.length > 200) throw new ApiError(400, 'INVALID_REQUEST', 'from is required');
	const departAfter = params.get('departAfter') ?? '';
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(departAfter) || Number.isNaN(Date.parse(departAfter))) {
		throw new ApiError(400, 'INVALID_REQUEST', 'departAfter must be a date-time with offset');
	}
	return {
		from,
		departAfter,
		minutes: integer(params, 'minutes', 15, 240),
		maxTransfers: integer(params, 'maxTransfers', 0, 2, 1),
		maxWalkMinutes: integer(params, 'maxWalkMinutes', 5, 30, 20)
	};
}

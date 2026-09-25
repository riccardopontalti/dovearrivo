// Semantic checks on a search request that the JSON schema cannot express
// (docs/PRODUCT.md limits, same local day, no past instants).
import type { NormalizedSearchRequest } from '$lib/api/types';
import { localDate, localTime, toMillis } from './time';

const EARLIEST_LOCAL = '06:00:00';
const LATEST_LOCAL = '23:00:00';
const MIN_WINDOW_SECONDS = 2 * 3600;
const MAX_WINDOW_SECONDS = 16 * 3600;

export type WindowProblem = 'differentDays' | 'outsideHours' | 'windowLength' | 'pastDate' | 'beforeNow';

/** English messages for the public API; the UI localises the codes itself. */
export const windowProblemMessages: Record<WindowProblem, string> = {
	differentDays: 'departAfter and returnBy must be on the same local day',
	outsideHours: 'The time window must stay between 06:00 and 23:00 local time',
	windowLength: 'The time window must last between 2 and 16 hours',
	pastDate: 'The date is in the past',
	beforeNow: 'For a search today, departAfter cannot be earlier than now'
};

/** Returns why the time window is not acceptable, or null. */
export function windowProblem(request: NormalizedSearchRequest, nowMs: number): WindowProblem | null {
	const start = toMillis(request.departAfter);
	const end = toMillis(request.returnBy);
	const day = localDate(start);

	if (localDate(end) !== day) return 'differentDays';
	if (localTime(start) < EARLIEST_LOCAL || localTime(end) > LATEST_LOCAL) return 'outsideHours';
	const window = (end - start) / 1000;
	if (window < MIN_WINDOW_SECONDS || window > MAX_WINDOW_SECONDS) return 'windowLength';
	if (day < localDate(nowMs)) return 'pastDate';
	if (start < nowMs && day === localDate(nowMs)) return 'beforeNow';
	return null;
}

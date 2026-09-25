// Pure decisions of the pipeline: imported window, rebuild need, coverage and metric drift.
import { addDays, localDate } from '../../src/lib/domain/time.ts';

export interface TimetableWindow {
	firstDay: string;
	lastDay: string;
	numDays: number;
}

/** Yesterday to today + 30 in Europe/Rome, both inclusive: 32 days (docs/DATA.md). */
export function timetableWindow(nowMs: number): TimetableWindow {
	const today = localDate(nowMs);
	return { firstDay: addDays(today, -1), lastDay: addDays(today, 30), numDays: 32 };
}

export interface ActiveSnapshotInfo {
	firstDay: string;
	sourceHashes: Record<string, string>;
}

export interface RebuildDecision {
	rebuild: boolean;
	reasons: string[];
}

/**
 * A new snapshot is needed when there is none, a source changed, or the local day moved
 * (the imported window must roll daily even if every feed is unchanged, case C11).
 */
export function decideRebuild(
	active: ActiveSnapshotInfo | null,
	sourceHashes: Record<string, string>,
	window: TimetableWindow,
	force = false
): RebuildDecision {
	const reasons: string[] = [];
	if (force) reasons.push('forced');
	if (!active) {
		reasons.push('no active snapshot');
		return { rebuild: true, reasons };
	}
	if (active.firstDay !== window.firstDay) reasons.push(`window moved to ${window.firstDay}`);
	for (const [id, hash] of Object.entries(sourceHashes)) {
		if (active.sourceHashes[id] !== hash) reasons.push(`source ${id} changed`);
	}
	for (const id of Object.keys(active.sourceHashes)) {
		if (!(id in sourceHashes)) reasons.push(`source ${id} removed`);
	}
	return { rebuild: reasons.length > 0, reasons };
}

/**
 * Last bookable day: the imported window, cut at the end of the shortest source coverage,
 * so that a feed ending early never silently drops its services from later dates.
 */
export function availableTo(window: TimetableWindow, sourceEnds: Array<string | null>): string {
	return sourceEnds.reduce<string>((min, end) => (end && end < min ? end : min), window.lastDay);
}

export interface DatasetMetrics {
	noLocations: number;
	noTrips: number;
	transportsXDays: number;
}

const REVIEW_THRESHOLD = 0.2;

/** Datasets whose size moved by more than 20%: not a defect, but promotion needs review. */
export function metricDrift(
	previous: Record<string, DatasetMetrics>,
	next: Record<string, DatasetMetrics>
): string[] {
	const findings: string[] = [];
	for (const [id, n] of Object.entries(next)) {
		const p = previous[id];
		if (!p) continue;
		for (const key of ['noLocations', 'transportsXDays'] as const) {
			const change = p[key] === 0 ? (n[key] === 0 ? 0 : Infinity) : Math.abs(n[key] - p[key]) / p[key];
			if (change > REVIEW_THRESHOLD) {
				findings.push(`${id}.${key} ${p[key]} -> ${n[key]} (${Math.round(change * 100)}%)`);
			}
		}
	}
	return findings;
}

/** Public limitations of a snapshot: scheduled data, unstated licences, early coverage end. */
export function snapshotLimitations(
	sources: Array<{ id: string; publisher: string; license: string | null; serviceTo: string | null }>,
	window: TimetableWindow,
	end: string
): string[] {
	const limitations = ['Scheduled timetables only; no real-time data.'];
	for (const s of sources) {
		if (!s.license || s.license === 'unstated') {
			limitations.push(`${s.publisher}: licence not stated by the publisher; see NOTICE.`);
		}
	}
	if (end < window.lastDay) {
		const short = sources.filter((s) => s.serviceTo === end).map((s) => s.id);
		limitations.push(`Coverage ends on ${end} because ${short.join(', ')} data end then.`);
	}
	return limitations;
}

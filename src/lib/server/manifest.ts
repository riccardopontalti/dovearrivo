// Manifest of the active data snapshot, written by the import pipeline (D06), and the
// public data status derived from it (docs/DATA.md, "Quality rules").
import { readFile } from 'node:fs/promises';
import type { DataStatus } from '$lib/api/types';
import { localDate } from '$lib/domain/time';

export interface ManifestSource {
	id: string;
	publisher: string;
	checkedAt: string | null;
	feedVersion?: string;
	sourceUrl: string;
	licenseUrl: string;
}

export interface Manifest {
	dataVersion: string;
	availableFrom: string;
	availableTo: string;
	sources: ManifestSource[];
	/** Localised by the pipeline; plain strings are accepted from older manifests. */
	limitations: Array<string | { it: string; en: string }>;
	/** Walking network coverage [minLon, minLat, maxLon, maxLat]; points outside cannot be routed. */
	coverageBbox?: [number, number, number, number];
}

const WARNING_AFTER_MS = 72 * 3600 * 1000;
const SUSPEND_AFTER_MS = 7 * 24 * 3600 * 1000;

export async function loadManifest(path: string): Promise<Manifest | null> {
	try {
		return JSON.parse(await readFile(path, 'utf8')) as Manifest;
	} catch {
		return null;
	}
}

/** Age of the oldest successful source check, or Infinity if a source was never checked. */
function oldestCheckAge(manifest: Manifest, nowMs: number): number {
	let age = 0;
	for (const s of manifest.sources) {
		if (!s.checkedAt) return Infinity;
		age = Math.max(age, nowMs - Date.parse(s.checkedAt));
	}
	return age;
}

export function deriveDataStatus(manifest: Manifest | null, nowMs: number, locale: 'it' | 'en' = 'it'): DataStatus {
	if (!manifest) {
		return {
			status: 'unavailable',
			dataVersion: null,
			timezone: 'Europe/Rome',
			availableFrom: null,
			availableTo: null,
			sources: [],
			limitations: [locale === 'it' ? 'Nessuna versione dei dati è attiva.' : 'No data snapshot is active.']
		};
	}
	const age = oldestCheckAge(manifest, nowMs);
	const expired = manifest.availableTo < localDate(nowMs);
	const status =
		age > SUSPEND_AFTER_MS || expired ? 'unavailable' : age > WARNING_AFTER_MS ? 'warning' : 'current';
	return {
		status,
		dataVersion: manifest.dataVersion,
		timezone: 'Europe/Rome',
		availableFrom: manifest.availableFrom,
		availableTo: manifest.availableTo,
		sources: manifest.sources,
		limitations: manifest.limitations.map((l) => (typeof l === 'string' ? l : l[locale]))
	};
}

// Typed view of config/sources.yaml.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export interface TransitSource {
	id: string;
	status: 'verified' | 'candidate' | 'optional';
	publisher: string;
	url: string;
	local_name: string;
	source_page: string;
	license: string | null;
	license_url: string | null;
	kind: 'gtfs-static' | 'netex';
}

export interface StreetSource {
	id: string;
	url: string;
	local_name: string;
	clip: { bbox: [number, number, number, number] };
	source_page: string;
	license: string;
	license_url: string;
}

export interface Sample {
	name: string;
	from: string;
	to: string;
	min_itineraries: number;
	require_mode?: string;
}

export interface PipelineConfig {
	timezone: string;
	transit: TransitSource[];
	street: StreetSource;
	samples: Sample[];
	validator_waivers?: Array<{ source: string; code: string; reason: string }>;
	updates: { osm_check_days: number };
	limits: {
		download_timeout_seconds: number;
		gtfs_download_bytes: number;
		gtfs_total_uncompressed_bytes: number;
		netex_download_bytes: number;
		osm_download_bytes: number;
		http_timeout_seconds: number;
		retries: number;
		retain_generations: number;
	};
}

export function loadConfig(path = 'config/sources.yaml'): PipelineConfig {
	const config = parse(readFileSync(path, 'utf8')) as PipelineConfig;
	if (config.timezone !== 'Europe/Rome') throw new Error('Only Europe/Rome is supported');
	for (const s of config.transit) {
		if (!/^[a-z0-9]+$/.test(s.id)) throw new Error(`Dataset id must be [a-z0-9]+: ${s.id}`);
		if (!s.url.startsWith('https://') && s.status === 'verified') {
			throw new Error(`Verified source must use https: ${s.id}`);
		}
	}
	return config;
}

/** Sources that enter a snapshot. */
export function activeTransit(config: PipelineConfig): TransitSource[] {
	return config.transit.filter((s) => s.status === 'verified');
}

export function downloadLimit(config: PipelineConfig, source: TransitSource): number {
	return source.kind === 'netex' ? config.limits.netex_download_bytes : config.limits.gtfs_download_bytes;
}

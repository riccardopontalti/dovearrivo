// MOTIS import, per-dataset metrics and sample searches on a temporary server.
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { addDays, localToMillis, formatInstant } from '../../src/lib/domain/time.ts';
import type { Sample } from './config.ts';
import type { DatasetMetrics, TimetableWindow } from './plan.ts';

export interface Dataset {
	tag: string;
	path: string;
}

export const SERVER_PORT = 8080;

export function motisConfig(osmPath: string, datasets: Dataset[], window: TimetableWindow): string {
	return stringify({
		server: { host: '0.0.0.0', port: SERVER_PORT, n_threads: 4 },
		osm: osmPath,
		street_routing: true,
		osr_footpath: true,
		geocoding: true,
		reverse_geocoding: false,
		timetable: {
			first_day: window.firstDay,
			num_days: window.numDays,
			with_shapes: true,
			adjust_footpaths: true,
			max_footpath_length: 15,
			merge_dupes_intra_src: false,
			merge_dupes_inter_src: false,
			datasets: Object.fromEntries(datasets.map((d) => [d.tag, { path: d.path, extend_calendar: false }]))
		},
		limits: {
			plan_max_results: 128,
			// Must exceed the 16-hour product window: MOTIS rejects a searchWindow equal to 960.
			plan_max_search_window_minutes: 1440,
			routing_max_timeout_seconds: 3,
			street_routing_max_prepost_transit_seconds: 1800
		},
		logging: { log_level: 'info' }
	});
}

export function run(cmd: string, args: string[], logFile: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const log = createWriteStream(logFile);
		const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		child.stdout.pipe(log, { end: false });
		child.stderr.pipe(log, { end: false });
		child.on('error', reject);
		child.on('close', (code) => {
			log.end();
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args[0]} exited with ${code}; see ${logFile}`));
		});
	});
}

/** MOTIS writes one metrics entry per dataset, ordered by dataset tag. */
export function readMetrics(dataDir: string, tags: string[]): Record<string, DatasetMetrics> {
	const raw = JSON.parse(readFileSync(join(dataDir, 'timetable_metrics.json'), 'utf8')) as Array<
		DatasetMetrics & { idx: number }
	>;
	const sorted = [...tags].sort();
	if (raw.length !== sorted.length) throw new Error(`Expected metrics for ${sorted.length} datasets, got ${raw.length}`);
	return Object.fromEntries(
		raw.map((m) => [sorted[m.idx], { noLocations: m.noLocations, noTrips: m.noTrips, transportsXDays: m.transportsXDays }])
	);
}

async function setPort(dataDir: string, port: number): Promise<void> {
	const file = join(dataDir, 'config.yml');
	const config = parse(readFileSync(file, 'utf8')) as { server: { port: number; host: string } };
	config.server.port = port;
	config.server.host = '127.0.0.1';
	await writeFile(file, stringify(config));
}

async function restorePort(dataDir: string): Promise<void> {
	const file = join(dataDir, 'config.yml');
	const config = parse(readFileSync(file, 'utf8')) as { server: { port: number; host: string } };
	config.server.port = SERVER_PORT;
	config.server.host = '0.0.0.0';
	await writeFile(file, stringify(config));
}

/** Starts MOTIS on a private port, runs `fn`, then stops it and restores the production port. */
export async function withServer<T>(bin: string, dataDir: string, port: number, fn: (baseUrl: string) => Promise<T>): Promise<T> {
	await setPort(dataDir, port);
	let child: ChildProcess | undefined;
	try {
		child = spawn(bin, ['server', '-d', dataDir], { stdio: 'ignore' });
		const baseUrl = `http://127.0.0.1:${port}`;
		const deadline = Date.now() + 120_000;
		for (;;) {
			try {
				if ((await fetch(`${baseUrl}/api/v1/health`)).ok) break;
			} catch {
				// not listening yet
			}
			if (Date.now() > deadline) throw new Error('MOTIS did not become healthy');
			await new Promise((r) => setTimeout(r, 500));
		}
		return await fn(baseUrl);
	} finally {
		child?.kill('SIGTERM');
		await restorePort(dataDir);
	}
}

export interface SampleResult {
	name: string;
	ok: boolean;
	itineraries: number;
	detail?: string;
}

/** Runs each sample for tomorrow 06:00-22:00 local time. */
export async function runSamples(baseUrl: string, samples: Sample[], window: TimetableWindow): Promise<SampleResult[]> {
	const tomorrow = addDays(window.firstDay, 2);
	const results: SampleResult[] = [];
	for (const s of samples) {
		const q = new URLSearchParams({
			fromPlace: s.from,
			toPlace: s.to,
			time: formatInstant(localToMillis(tomorrow, '06:00')),
			timetableView: 'true',
			searchWindow: String(16 * 3600),
			numItineraries: '1',
			maxItineraries: '64',
			directModes: '',
			transitModes: 'TRANSIT',
			maxPreTransitTime: '1800',
			maxPostTransitTime: '1800'
		});
		try {
			const r = await fetch(`${baseUrl}/api/v6/plan?${q}`);
			const body = (await r.json()) as { error?: string; itineraries?: Array<{ legs: Array<{ mode: string }> }> };
			if (!r.ok) {
				results.push({ name: s.name, ok: false, itineraries: 0, detail: body.error ?? `HTTP ${r.status}` });
				continue;
			}
			let its = body.itineraries ?? [];
			if (s.require_mode) its = its.filter((i) => i.legs.some((l) => l.mode === s.require_mode));
			const ok = its.length >= s.min_itineraries;
			results.push({ name: s.name, ok, itineraries: its.length, ...(ok ? {} : { detail: `expected at least ${s.min_itineraries}` }) });
		} catch (error) {
			results.push({ name: s.name, ok: false, itineraries: 0, detail: String(error) });
		}
	}
	return results;
}

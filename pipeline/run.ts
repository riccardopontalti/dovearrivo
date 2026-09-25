// Data pipeline (docs/DATA.md). Checks sources, rebuilds a snapshot when needed, verifies
// it and promotes it. The active snapshot is never touched by a failed run.
//
//   MOTIS_BIN=/path/to/motis node pipeline/run.ts [--data data/pipeline] [--force]
//     [--accept-change] [--source-file <id>=<path>] [--osm-file <path>]
//
// Exit codes: 0 done (new snapshot or nothing to do), 1 failed (active kept),
// 2 promotion needs review (large change; rerun with --accept-change).
import { execFileSync, spawnSync } from 'node:child_process';
import { rmSync, createReadStream, createWriteStream, existsSync, openSync, closeSync, readFileSync, readSync, unlinkSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { localDate } from '../src/lib/domain/time.ts';
import { activeTransit, downloadLimit, loadConfig, type TransitSource } from './lib/config.ts';
import { fetchSource, type FetchState } from './lib/fetch.ts';
import { inspectGtfs, inspectNetex, type FeedReport } from './lib/feeds.ts';
import { motisConfig, readMetrics, run, runSamples, withServer, type SampleResult } from './lib/motis.ts';
import { availableTo, decideRebuild, metricDrift, snapshotLimitations, timetableWindow, type DatasetMetrics, type Localized } from './lib/plan.ts';
import { Store, writeJsonAtomic, type PipelineState } from './lib/store.ts';
import { runValidator, validatorVerdict } from './lib/validator.ts';

const NOTICE_URL = 'https://github.com/riccardopontalti/dovearrivo/blob/main/NOTICE.md';
const SAMPLE_PORT = 8095;

interface ManifestSource {
	id: string;
	publisher: string;
	checkedAt: string | null;
	feedVersion?: string;
	sourceUrl: string;
	licenseUrl: string;
}

interface SnapshotManifest {
	dataVersion: string;
	availableFrom: string;
	availableTo: string;
	sources: ManifestSource[];
	limitations: Localized[];
	coverageBbox: [number, number, number, number];
	window: { firstDay: string; lastDay: string };
	sourceHashes: Record<string, string>;
	metrics: Record<string, DatasetMetrics>;
	engine: string;
	builtAt: string;
}

const { values: args } = parseArgs({
	options: {
		data: { type: 'string', default: 'data/pipeline' },
		force: { type: 'boolean', default: false },
		'accept-change': { type: 'boolean', default: false },
		'source-file': { type: 'string', multiple: true, default: [] },
		'osm-file': { type: 'string' }
	}
});

const log = (msg: string) => console.log(`[pipeline] ${msg}`);

function sha256File(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isGzip(path: string): boolean {
	const fd = openSync(path, 'r');
	const buf = Buffer.alloc(2);
	readSync(fd, buf, 0, 2, 0);
	closeSync(fd);
	return buf[0] === 0x1f && buf[1] === 0x8b;
}

/** NeTEx from the NAP is a gzipped XML; MOTIS reads it from a ZIP. */
async function netexZip(file: string, maxUncompressed: number): Promise<string> {
	if (!isGzip(file)) return file;
	const zipPath = file.replace(/(\.[a-z]+)?$/, '.netex.zip');
	if (existsSync(zipPath)) return zipPath;
	const workDir = `${file}.work`;
	await mkdir(workDir, { recursive: true });
	const xml = join(workDir, 'data.xml');
	let bytes = 0;
	const gunzip = createGunzip();
	gunzip.on('data', (chunk: Buffer) => {
		bytes += chunk.length;
		if (bytes > maxUncompressed) gunzip.destroy(new Error('NeTEx exceeds the uncompressed size limit'));
	});
	await streamPipeline(createReadStream(file), gunzip, createWriteStream(xml));
	execFileSync('zip', ['-q', '-j', '-X', zipPath, xml]);
	rmSync(workDir, { recursive: true, force: true });
	return zipPath;
}

async function main(): Promise<number> {
	const config = loadConfig();
	const bin = process.env.MOTIS_BIN;
	if (!bin) throw new Error('Set MOTIS_BIN to the pinned MOTIS binary');
	const store = new Store(resolve(args.data!));
	await mkdir(store.root, { recursive: true });

	const lockFile = store.path('pipeline.lock');
	try {
		writeFileSync(lockFile, String(process.pid), { flag: 'wx' });
	} catch {
		log(`another run holds ${lockFile}`);
		return 1;
	}
	try {
		return await pipeline(config, bin, store);
	} finally {
		unlinkSync(lockFile);
	}
}

async function pipeline(config: ReturnType<typeof loadConfig>, bin: string, store: Store): Promise<number> {
	const now = new Date();
	const window = timetableWindow(now.getTime());
	const state: PipelineState = store.readState();
	const overrides = new Map(args['source-file']!.map((s) => s.split('=') as [string, string]));
	const fetchOptions = (maxBytes: number) => ({
		maxBytes,
		headerTimeoutMs: config.limits.http_timeout_seconds * 1000,
		bodyTimeoutMs: config.limits.download_timeout_seconds * 1000,
		retries: config.limits.retries,
		now: () => new Date()
	});

	// 1. Transit sources.
	const sources = activeTransit(config);
	const inputs: Record<string, { zip: string; report: FeedReport; state: FetchState; source: TransitSource }> = {};
	for (const source of sources) {
		let fetched: { state: FetchState; changed: boolean };
		const override = overrides.get(source.id);
		if (override) {
			const sha256 = sha256File(override);
			fetched = { state: { url: `file:${override}`, file: resolve(override), sha256, checkedAt: now.toISOString() }, changed: state.sources[source.id]?.sha256 !== sha256 };
		} else {
			try {
				fetched = await fetchSource(source.url, store.path('sources', source.id), state.sources[source.id], fetchOptions(downloadLimit(config, source)));
			} catch (error) {
				log(`download of ${source.id} failed: ${String(error)}`);
				return 1;
			}
		}
		state.sources[source.id] = fetched.state;
		const file = fetched.state.file!;
		const zip = source.kind === 'netex' ? await netexZip(file, config.limits.gtfs_total_uncompressed_bytes) : file;
		const report = source.kind === 'netex'
			? inspectNetex(zip, config.limits.gtfs_total_uncompressed_bytes)
			: inspectGtfs(zip, config.limits.gtfs_total_uncompressed_bytes);
		log(`${source.id}: ${fetched.changed ? 'new file' : 'unchanged'}, service ${report.serviceFrom} → ${report.serviceTo}${report.ok ? '' : `, PROBLEMS: ${report.problems.join('; ')}`}`);
		if (!report.ok) {
			await store.writeState(state);
			log(`${source.id} is not usable; the active snapshot stays in place`);
			return 1;
		}
		const jar = process.env.GTFS_VALIDATOR_JAR;
		if (jar && source.kind === 'gtfs-static') {
			try {
				const out = store.path('validation', source.id, fetched.state.sha256!.slice(0, 16));
				const verdict = validatorVerdict(source.id, await runValidator(jar, zip, out), config.validator_waivers ?? []);
				report.validator = verdict;
				log(`${source.id}: validator ${verdict.blocking.length} blocking, ${verdict.waived.length} waived, ${verdict.warnings} warnings`);
				if (verdict.blocking.length) {
					log(`${source.id} has validator errors: ${verdict.blocking.join(', ')}; the active snapshot stays in place`);
					await store.writeState(state);
					return 1;
				}
			} catch (error) {
				log(`validator failed for ${source.id}: ${String(error)}; the active snapshot stays in place`);
				return 1;
			}
		} else if (source.kind === 'gtfs-static') {
			log(`${source.id}: GTFS validator skipped (GTFS_VALIDATOR_JAR not set)`);
		}
		inputs[source.id] = { zip, report, state: fetched.state, source };
	}

	// 2. OpenStreetMap: weekly check, clip only after a change.
	const street = config.street;
	const osmDue = !state.osm?.checkedAt || now.getTime() - Date.parse(state.osm.checkedAt) > config.updates.osm_check_days * 86_400_000;
	if (args['osm-file']) {
		const file = resolve(args['osm-file']);
		const sha256 = sha256File(file);
		if (state.osm?.sha256 !== sha256 || !state.osm.clipFile) state.osm = { url: `file:${file}`, file, sha256, checkedAt: now.toISOString() };
	} else if (osmDue || !state.osm?.clipFile) {
		try {
			const fetched = await fetchSource(street.url, store.path('sources', 'osm'), state.osm, fetchOptions(config.limits.osm_download_bytes));
			state.osm = { ...state.osm, ...fetched.state, ...(fetched.changed ? { clipFile: undefined } : {}) };
		} catch (error) {
			log(`OSM download failed: ${String(error)}`);
			if (!state.osm?.clipFile) return 1;
		}
	}
	if (!state.osm?.clipFile || state.osm.clippedFrom !== state.osm.sha256) {
		const clip = store.path('sources', 'osm', `clip-${state.osm!.sha256!.slice(0, 16)}.osm.pbf`);
		await mkdir(dirname(clip), { recursive: true });
		execFileSync('osmium', ['extract', '--strategy', 'complete_ways', '--bbox', street.clip.bbox.join(','), state.osm!.file!, '-o', clip, '--overwrite']);
		// check-refs reports on stderr and exits non-zero when references are missing.
		const check = spawnSync('osmium', ['check-refs', clip], { encoding: 'utf8' });
		const refs = `${check.stdout}${check.stderr}`;
		const missing = Number(/Nodes in ways missing: (\d+)/.exec(refs)?.[1] ?? 'NaN');
		if (missing !== 0) {
			log(`OSM clip has ${missing} missing node references; the active snapshot stays in place`);
			return 1;
		}
		state.osm = { ...state.osm!, clipFile: clip, clippedFrom: state.osm!.sha256 };
		log(`OSM clipped: ${clip}`);
	}
	await store.writeState(state);

	// 3. Decide.
	const hashes: Record<string, string> = Object.fromEntries(Object.entries(inputs).map(([id, i]) => [id, i.state.sha256!]));
	hashes.osm = state.osm!.sha256!;
	const active = store.readActiveManifest<SnapshotManifest>();
	const decision = decideRebuild(active ? { firstDay: active.window.firstDay, sourceHashes: active.sourceHashes } : null, hashes, window, args.force);
	if (!decision.rebuild) {
		// Nothing changed: record the successful checks on the active snapshot.
		for (const s of active!.sources) {
			const input = inputs[s.id];
			if (input && active!.sourceHashes[s.id] === input.state.sha256) s.checkedAt = input.state.checkedAt ?? s.checkedAt;
			if (s.id === 'osm' && state.osm?.checkedAt && active!.sourceHashes.osm === state.osm.sha256) s.checkedAt = state.osm.checkedAt;
		}
		await writeJsonAtomic(store.path('active', 'manifest.json'), active);
		log('no rebuild needed; checks recorded on the active snapshot');
		return 0;
	}
	log(`rebuild: ${decision.reasons.join(', ')}`);

	// 4. Import.
	const id = `${now.toISOString().replace(/[-:]/g, '').slice(0, 13)}Z-${window.firstDay}`;
	const dir = store.path('snapshots', id);
	await mkdir(dir, { recursive: true });
	const configText = motisConfig(state.osm!.clipFile!, Object.entries(inputs).map(([tag, i]) => ({ tag, path: i.zip })), window);
	writeFileSync(join(dir, 'config.yml'), configText);
	const started = Date.now();
	try {
		await run(bin, ['import', '-c', join(dir, 'config.yml'), '-d', join(dir, 'motis')], join(dir, 'import.log'));
	} catch (error) {
		log(`import failed: ${String(error)}; the active snapshot stays in place`);
		return 1;
	}
	const importSeconds = (Date.now() - started) / 1000;
	const metrics = readMetrics(join(dir, 'motis'), Object.keys(inputs));
	log(`imported in ${importSeconds.toFixed(1)} s: ${Object.entries(metrics).map(([k, m]) => `${k} ${m.noTrips} trips`).join(', ')}`);
	const empty = Object.entries(metrics).filter(([, m]) => m.noTrips === 0 || m.transportsXDays === 0);
	if (empty.length) {
		log(`datasets without service in the window: ${empty.map(([k]) => k).join(', ')}; not promoting`);
		return 1;
	}

	// 5. Samples on the new snapshot.
	let samples: SampleResult[];
	try {
		samples = await withServer(bin, join(dir, 'motis'), SAMPLE_PORT, (url) => runSamples(url, config.samples, window));
	} catch (error) {
		log(`sample server failed: ${String(error)}`);
		return 1;
	}
	for (const s of samples) log(`sample ${s.ok ? 'ok  ' : 'FAIL'} ${s.name}: ${s.itineraries}${s.detail ? ` (${s.detail})` : ''}`);

	// 6. Drift and manifest.
	const drift = active ? metricDrift(active.metrics, metrics) : [];
	const end = availableTo(window, Object.values(inputs).map((i) => i.report.serviceTo));
	const limitations = snapshotLimitations(
		Object.entries(inputs).map(([sid, i]) => ({ id: sid, publisher: i.source.publisher, license: i.source.license, serviceTo: i.report.serviceTo })),
		window,
		end
	);
	const manifest: SnapshotManifest = {
		dataVersion: id,
		availableFrom: localDate(now.getTime()),
		availableTo: end,
		sources: [
			...Object.entries(inputs).map(([sid, i]) => ({
				id: sid,
				publisher: i.source.publisher,
				checkedAt: i.state.checkedAt ?? null,
				...(i.report.feedVersion ? { feedVersion: i.report.feedVersion } : {}),
				sourceUrl: i.source.source_page,
				licenseUrl: i.source.license_url ?? NOTICE_URL
			})),
			{ id: 'osm', publisher: 'OpenStreetMap contributors', checkedAt: state.osm!.checkedAt ?? null, sourceUrl: street.source_page, licenseUrl: street.license_url }
		],
		limitations,
		coverageBbox: street.clip.bbox,
		window: { firstDay: window.firstDay, lastDay: window.lastDay },
		sourceHashes: hashes,
		metrics,
		engine: 'motis-2.11.3',
		builtAt: now.toISOString()
	};
	const report = { id, reasons: decision.reasons, importSeconds, feeds: Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.report])), metrics, drift, samples };
	await writeJsonAtomic(join(dir, 'report.json'), report);
	await writeJsonAtomic(join(dir, 'manifest.json'), manifest);

	if (samples.some((s) => !s.ok)) {
		log(`sample checks failed; snapshot ${id} kept for inspection, not promoted`);
		return 1;
	}
	if (drift.length && !args['accept-change']) {
		log(`large changes need review: ${drift.join('; ')}`);
		log(`inspect ${join(dir, 'report.json')} and rerun with --accept-change to promote`);
		return 2;
	}

	// 7. Promote.
	await store.promote(id, state, config.limits.retain_generations);
	log(`promoted ${id}; available ${manifest.availableFrom} → ${manifest.availableTo}`);
	if (process.env.PROMOTE_HOOK) {
		execFileSync('sh', ['-c', process.env.PROMOTE_HOOK], { stdio: 'inherit' });
	} else {
		log('restart MOTIS on the active snapshot to serve it (set PROMOTE_HOOK to automate)');
	}
	return 0;
}

main().then(
	(code) => process.exit(code),
	(error) => {
		console.error(error);
		process.exit(1);
	}
);

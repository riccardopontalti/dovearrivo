// On-disk layout of the data directory:
//   state.json                 download state per source (etag, hash, checkedAt)
//   sources/<id>/              downloaded files, named by content hash
//   snapshots/<id>/            config.yml, motis/ (engine data), manifest.json, report.json
//   active -> snapshots/<id>   symlink read by the app (manifest) and MOTIS (motis/)
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readlink, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { FetchState } from './fetch.ts';

export interface PipelineState {
	sources: Record<string, FetchState & { derivedFile?: string }>;
	osm?: FetchState & { clipFile?: string; clippedFrom?: string };
	/** Snapshot ids, most recent first, excluding the active one. */
	previous: string[];
}

export class Store {
	readonly root: string;

	constructor(root: string) {
		this.root = root;
	}

	path(...parts: string[]): string {
		return join(this.root, ...parts);
	}

	readState(): PipelineState {
		const file = this.path('state.json');
		if (!existsSync(file)) return { sources: {}, previous: [] };
		return JSON.parse(readFileSync(file, 'utf8')) as PipelineState;
	}

	async writeState(state: PipelineState): Promise<void> {
		await writeJsonAtomic(this.path('state.json'), state);
	}

	/** Id of the active snapshot, or null. */
	async activeId(): Promise<string | null> {
		try {
			return basename(await readlink(this.path('active')));
		} catch {
			return null;
		}
	}

	readActiveManifest<T>(): T | null {
		const file = this.path('active', 'manifest.json');
		return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : null;
	}

	/** Atomically points `active` to a snapshot and records the previous one for rollback. */
	async promote(id: string, state: PipelineState, keep: number): Promise<void> {
		const before = await this.activeId();
		await switchLink(this.path('active'), join('snapshots', id));
		if (before && before !== id) state.previous = [before, ...state.previous.filter((p) => p !== before && p !== id)];
		state.previous = state.previous.filter((p) => p !== id).slice(0, Math.max(0, keep - 1));
		await this.writeState(state);
		await this.prune(state);
		await this.markPromoted(id);
	}

	/** Tells the host (deploy/update.sh) that MOTIS must restart on the new active snapshot. */
	async markPromoted(id: string): Promise<void> {
		await writeFile(this.path('promoted'), `${id}\n`);
	}

	/** Makes the most recent previous snapshot active again. */
	async rollback(state: PipelineState): Promise<string> {
		const target = state.previous[0];
		if (!target || !existsSync(this.path('snapshots', target))) throw new Error('No previous snapshot to restore');
		const current = await this.activeId();
		await switchLink(this.path('active'), join('snapshots', target));
		state.previous = [...(current ? [current] : []), ...state.previous.slice(1)];
		await this.writeState(state);
		await this.markPromoted(target);
		return target;
	}

	/** Deletes snapshots that are neither active nor kept for rollback. */
	async prune(state: PipelineState): Promise<void> {
		const active = await this.activeId();
		const keep = new Set([active, ...state.previous]);
		const dir = this.path('snapshots');
		if (!existsSync(dir)) return;
		for (const name of await readdir(dir)) {
			if (!keep.has(name)) await rm(join(dir, name), { recursive: true, force: true });
		}
	}
}

async function switchLink(link: string, target: string): Promise<void> {
	const tmp = `${link}.tmp-${process.pid}`;
	await rm(tmp, { force: true });
	await symlink(target, tmp);
	await rename(tmp, link);
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
	await mkdir(join(file, '..'), { recursive: true });
	const tmp = `${file}.tmp-${process.pid}`;
	await writeFile(tmp, JSON.stringify(value, null, '\t') + '\n');
	await rename(tmp, file);
}

import { mkdirSync, mkdtempSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Store } from './store.ts';

function snapshot(store: Store, id: string) {
	mkdirSync(store.path('snapshots', id), { recursive: true });
	writeFileSync(store.path('snapshots', id, 'manifest.json'), JSON.stringify({ dataVersion: id }));
}

describe('Store promotion and rollback', () => {
	it('keeps the configured generations, prunes older ones and restores the previous one', async () => {
		const store = new Store(mkdtempSync(join(tmpdir(), 'dovearrivo-store-')));
		const state = store.readState();
		for (const id of ['s1', 's2', 's3']) {
			snapshot(store, id);
			await store.promote(id, state, 2);
		}
		expect(await store.activeId()).toBe('s3');
		expect(state.previous).toEqual(['s2']);
		expect(existsSync(store.path('snapshots', 's1'))).toBe(false);

		// A faulty s3 is replaced entirely by s2.
		expect(await store.rollback(state)).toBe('s2');
		expect(await store.activeId()).toBe('s2');
		expect(JSON.parse(readFileSync(store.path('active', 'manifest.json'), 'utf8')).dataVersion).toBe('s2');
		expect(store.readState().previous).toEqual(['s3']);
	});

	it('refuses to roll back without a previous snapshot', async () => {
		const store = new Store(mkdtempSync(join(tmpdir(), 'dovearrivo-store-')));
		await expect(store.rollback(store.readState())).rejects.toThrow(/No previous snapshot/);
	});
});

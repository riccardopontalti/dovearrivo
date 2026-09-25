// Restores the previous snapshot: node pipeline/rollback.ts [--data data/pipeline]
// Restart MOTIS afterwards (or set PROMOTE_HOOK) so the engine serves the restored data.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Store } from './lib/store.ts';

const { values } = parseArgs({ options: { data: { type: 'string', default: 'data/pipeline' } } });
const store = new Store(resolve(values.data!));
const restored = await store.rollback(store.readState());
console.log(`[pipeline] active snapshot restored to ${restored}`);
if (process.env.PROMOTE_HOOK) execFileSync('sh', ['-c', process.env.PROMOTE_HOOK], { stdio: 'inherit' });

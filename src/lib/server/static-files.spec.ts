import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRange, safePath, serveFile } from './static-files';

const root = mkdtempSync(join(tmpdir(), 'dovearrivo-static-'));
writeFileSync(join(root, 'tiles.pmtiles'), '0123456789');
writeFileSync(join(root, 'secret.env'), 'x');

describe('static files for the basemap', () => {
	it('refuses paths outside the root and unexpected file types', () => {
		expect(safePath(root, '../etc/passwd')).toBeNull();
		expect(safePath(root, 'secret.env')).toBeNull();
		expect(safePath(root, 'tiles.pmtiles')).toBe(join(root, 'tiles.pmtiles'));
	});

	it('parses byte ranges, including suffix ranges', () => {
		expect(parseRange('bytes=2-4', 10)).toEqual({ start: 2, end: 4 });
		expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
		expect(parseRange('bytes=8-', 10)).toEqual({ start: 8, end: 9 });
		expect(parseRange('bytes=12-20', 10)).toBe('invalid');
		expect(parseRange(null, 10)).toBeNull();
	});

	it('answers range requests with 206 and the requested bytes', async () => {
		const r = await serveFile(root, 'tiles.pmtiles', new Request('http://x/', { headers: { range: 'bytes=2-4' } }));
		expect(r.status).toBe(206);
		expect(r.headers.get('content-range')).toBe('bytes 2-4/10');
		expect(await r.text()).toBe('234');
		expect((await serveFile(root, 'missing.pmtiles', new Request('http://x/'))).status).toBe(404);
	});
});

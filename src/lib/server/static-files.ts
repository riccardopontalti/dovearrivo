// Serves files from a directory with HTTP Range support (PMTiles reads byte ranges).
// In production Caddy can serve the same directory; this keeps development self-contained.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

const TYPES: Record<string, string> = {
	'.pmtiles': 'application/vnd.pmtiles',
	'.pbf': 'application/x-protobuf',
	'.json': 'application/json',
	'.png': 'image/png',
	'.txt': 'text/plain; charset=utf-8'
};

/** Resolves a request path inside `root`, or null if it escapes it or has a disallowed type. */
export function safePath(root: string, requested: string): string | null {
	const base = resolve(root);
	const full = resolve(base, requested);
	if (full !== base && !full.startsWith(base + sep)) return null;
	return extname(full) in TYPES ? full : null;
}

/** Parses a single "bytes=start-end" range against a file size. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
	if (!header) return null;
	const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!m || (m[1] === '' && m[2] === '')) return 'invalid';
	let start: number;
	let end: number;
	if (m[1] === '') {
		start = Math.max(0, size - Number(m[2]));
		end = size - 1;
	} else {
		start = Number(m[1]);
		end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
	}
	return start > end || start >= size ? 'invalid' : { start, end };
}

export async function serveFile(root: string, requested: string, request: Request): Promise<Response> {
	const file = safePath(root, requested);
	if (!file) return new Response('Not found', { status: 404 });
	let size: number;
	try {
		const info = await stat(file);
		if (!info.isFile()) return new Response('Not found', { status: 404 });
		size = info.size;
	} catch {
		return new Response('Not found', { status: 404 });
	}
	const headers = new Headers({
		'content-type': TYPES[extname(file)],
		'accept-ranges': 'bytes',
		// Asset URLs carry the basemap version, so they can be cached for long.
		'cache-control': 'public, max-age=86400'
	});
	const range = parseRange(request.headers.get('range'), size);
	if (range === 'invalid') {
		headers.set('content-range', `bytes */${size}`);
		return new Response(null, { status: 416, headers });
	}
	const { start, end } = range ?? { start: 0, end: size - 1 };
	headers.set('content-length', String(end - start + 1));
	if (range) headers.set('content-range', `bytes ${start}-${end}/${size}`);
	if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });
	const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
	return new Response(body, { status: range ? 206 : 200, headers });
}

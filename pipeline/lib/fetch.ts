// Conditional, size-limited downloads with retries. A download that fails never removes
// the previous file; an unchanged file keeps its identity and only refreshes checkedAt.
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';

export interface FetchState {
	url: string;
	file?: string;
	sha256?: string;
	etag?: string;
	lastModified?: string;
	fetchedAt?: string;
	checkedAt?: string;
}

export interface FetchOptions {
	maxBytes: number;
	headerTimeoutMs: number;
	bodyTimeoutMs: number;
	retries: number;
	now: () => Date;
}

export interface FetchResult {
	state: FetchState;
	changed: boolean;
}

export async function fetchSource(
	url: string,
	dir: string,
	previous: FetchState | undefined,
	options: FetchOptions
): Promise<FetchResult> {
	if (!url.startsWith('https://')) throw new Error(`Refusing non-https URL: ${url}`);
	let lastError: unknown;
	for (let attempt = 0; attempt <= options.retries; attempt++) {
		try {
			return await attemptFetch(url, dir, previous, options);
		} catch (error) {
			lastError = error;
			if (attempt < options.retries) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
		}
	}
	throw lastError;
}

async function attemptFetch(
	url: string,
	dir: string,
	previous: FetchState | undefined,
	options: FetchOptions
): Promise<FetchResult> {
	const sameUrl = previous?.url === url && previous.file && existsSync(previous.file);
	const headers: Record<string, string> = { 'user-agent': 'DoveArrivo-pipeline (+https://github.com/riccardopontalti/dovearrivo)' };
	if (sameUrl && previous?.etag) headers['if-none-match'] = previous.etag;
	if (sameUrl && previous?.lastModified) headers['if-modified-since'] = previous.lastModified;

	const controller = new AbortController();
	const headerTimer = setTimeout(() => controller.abort(new Error('header timeout')), options.headerTimeoutMs);
	const bodyTimer = setTimeout(() => controller.abort(new Error('download timeout')), options.bodyTimeoutMs);
	try {
		const response = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
		clearTimeout(headerTimer);
		const checkedAt = options.now().toISOString();
		if (response.status === 304 && previous) {
			return { state: { ...previous, checkedAt }, changed: false };
		}
		if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} for ${url}`);
		const declared = Number(response.headers.get('content-length') ?? '0');
		if (declared > options.maxBytes) throw new Error(`${url} is ${declared} bytes, over the limit`);

		await mkdir(dir, { recursive: true });
		const tmp = join(dir, `.download-${process.pid}`);
		const hash = createHash('sha256');
		const out = createWriteStream(tmp);
		let bytes = 0;
		try {
			for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
				bytes += chunk.length;
				if (bytes > options.maxBytes) throw new Error(`${url} exceeded ${options.maxBytes} bytes`);
				hash.update(chunk);
				if (!out.write(chunk)) await new Promise<void>((r) => out.once('drain', () => r()));
			}
			await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
		} catch (error) {
			out.destroy();
			await rm(tmp, { force: true });
			throw error;
		}

		const sha256 = hash.digest('hex');
		const meta = {
			url,
			etag: response.headers.get('etag') ?? undefined,
			lastModified: response.headers.get('last-modified') ?? undefined,
			checkedAt
		};
		if (previous?.sha256 === sha256 && previous.file && existsSync(previous.file)) {
			await rm(tmp, { force: true });
			return { state: { ...previous, ...meta }, changed: false };
		}
		const ext = extname(new URL(url).pathname).replace(/[^.a-z0-9]/gi, '') || '.bin';
		const file = join(dir, `${sha256.slice(0, 16)}${ext}`);
		await rename(tmp, file);
		return { state: { ...meta, file, sha256, fetchedAt: checkedAt }, changed: true };
	} finally {
		clearTimeout(headerTimer);
		clearTimeout(bodyTimer);
	}
}

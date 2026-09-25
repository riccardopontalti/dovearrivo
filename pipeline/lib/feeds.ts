// Structural checks and service coverage of GTFS and NeTEx files.
import { execFileSync } from 'node:child_process';

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): Record<string, string>[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	const src = text.replace(/^﻿/, '');
	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		if (quoted) {
			if (c === '"' && src[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && src[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	const [header, ...data] = rows.filter((r) => r.length > 1 || r[0] !== '');
	if (!header) return [];
	return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const REQUIRED_GTFS = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];

export function missingGtfsFiles(files: string[]): string[] {
	const names = new Set(files.map((f) => f.split('/').pop()));
	const missing = REQUIRED_GTFS.filter((f) => !names.has(f));
	if (!names.has('calendar.txt') && !names.has('calendar_dates.txt')) {
		missing.push('calendar.txt or calendar_dates.txt');
	}
	return missing;
}

function isoDate(yyyymmdd: string): string {
	return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** First and last service day declared by calendar.txt and added dates in calendar_dates.txt. */
export function gtfsServiceRange(
	calendar: Record<string, string>[],
	calendarDates: Record<string, string>[]
): { from: string | null; to: string | null } {
	const days: string[] = [];
	for (const c of calendar) {
		if (c.start_date) days.push(isoDate(c.start_date));
		if (c.end_date) days.push(isoDate(c.end_date));
	}
	for (const d of calendarDates) {
		if (d.exception_type === '1' && d.date) days.push(isoDate(d.date));
	}
	days.sort();
	return { from: days[0] ?? null, to: days[days.length - 1] ?? null };
}

/** Validity of the first NeTEx frame, read from the head of the document. */
export function netexValidity(head: string): { from: string | null; to: string | null } {
	const from = /<FromDate>(\d{4}-\d{2}-\d{2})/.exec(head)?.[1] ?? null;
	const to = /<ToDate>(\d{4}-\d{2}-\d{2})/.exec(head)?.[1] ?? null;
	return { from, to };
}

export interface FeedReport {
	ok: boolean;
	problems: string[];
	serviceFrom: string | null;
	serviceTo: string | null;
	feedVersion?: string;
	uncompressedBytes: number;
	validator?: { blocking: string[]; waived: string[]; warnings: number; infos: number };
}

function unzipList(zip: string): { names: string[]; bytes: number } {
	const out = execFileSync('unzip', ['-Z', '-l', zip], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
	const names: string[] = [];
	let bytes = 0;
	for (const line of out.split('\n')) {
		const m = /^\S+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+\S+\s+\S+\s+\S+\s+(.+)$/.exec(line);
		if (!m) continue;
		bytes += Number(m[1]);
		names.push(m[2]);
	}
	return { names, bytes };
}

function unzipText(zip: string, name: string, maxBytes = 64 * 1024 * 1024): string {
	try {
		return execFileSync('unzip', ['-p', zip, name], { encoding: 'utf8', maxBuffer: maxBytes });
	} catch {
		return '';
	}
}

export function inspectGtfs(zip: string, maxUncompressed: number): FeedReport {
	const problems: string[] = [];
	let list: { names: string[]; bytes: number };
	try {
		list = unzipList(zip);
	} catch {
		return { ok: false, problems: ['not a readable ZIP'], serviceFrom: null, serviceTo: null, uncompressedBytes: 0 };
	}
	if (list.names.some((n) => n.includes('..') || n.startsWith('/'))) problems.push('unsafe path in ZIP');
	if (list.bytes > maxUncompressed) problems.push(`uncompressed size ${list.bytes} exceeds limit`);
	const missing = missingGtfsFiles(list.names);
	if (missing.length) problems.push(`missing ${missing.join(', ')}`);

	const range = gtfsServiceRange(
		parseCsv(unzipText(zip, 'calendar.txt')),
		parseCsv(unzipText(zip, 'calendar_dates.txt'))
	);
	if (!range.to) problems.push('no service dates');
	if (!unzipText(zip, 'stop_times.txt', 512 * 1024 * 1024).includes('\n')) problems.push('empty stop_times.txt');
	const feedVersion = parseCsv(unzipText(zip, 'feed_info.txt'))[0]?.feed_version || undefined;
	return {
		ok: problems.length === 0,
		problems,
		serviceFrom: range.from,
		serviceTo: range.to,
		...(feedVersion ? { feedVersion } : {}),
		uncompressedBytes: list.bytes
	};
}

export function inspectNetex(zip: string, maxUncompressed: number): FeedReport {
	const problems: string[] = [];
	let list: { names: string[]; bytes: number };
	try {
		list = unzipList(zip);
	} catch {
		return { ok: false, problems: ['not a readable ZIP'], serviceFrom: null, serviceTo: null, uncompressedBytes: 0 };
	}
	if (list.bytes > maxUncompressed) problems.push(`uncompressed size ${list.bytes} exceeds limit`);
	const xml = list.names.find((n) => n.endsWith('.xml'));
	if (!xml) problems.push('no XML document');
	const head = xml
		? execFileSync('sh', ['-c', 'unzip -p "$1" "$2" | head -c 65536', 'sh', zip, xml], { encoding: 'utf8' })
		: '';
	const validity = netexValidity(head);
	if (!validity.to) problems.push('no ValidBetween in the first frame');
	return {
		ok: problems.length === 0,
		problems,
		serviceFrom: validity.from,
		serviceTo: validity.to,
		uncompressedBytes: list.bytes
	};
}

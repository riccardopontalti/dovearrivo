// Destination catalogue: versioned YAML validated against catalogue/destinations.schema.json.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import schema from '../../../catalogue/destinations.schema.json';
import type { Destination } from '$lib/api/types';

type Localized = { it: string; en: string };

export interface CatalogueEntry {
	id: string;
	status: 'draft' | 'published';
	name: Localized;
	category: string;
	description: Localized;
	entrance: { lat: number; lon: number };
	infoUrl: string;
	accessNotes?: Localized;
	check: { checkedAt: string; checkedBy: string; coordinateSource: string; exclusionReason?: string };
}

export interface Catalogue {
	version: string;
	entries: CatalogueEntry[];
}

const ajv = new Ajv2020({ allErrors: true });
addFormats.default(ajv);
const validateCatalogue = ajv.compile<CatalogueEntry[]>(schema);

/** Parses and validates catalogue YAML; throws with every schema error on invalid input. */
export function parseCatalogue(text: string): Catalogue {
	const data: unknown = parse(text);
	if (!validateCatalogue(data)) {
		const errors = validateCatalogue.errors
			?.map((e) => `${e.instancePath || '(root)'} ${e.message}`)
			.join('; ');
		throw new Error(`Invalid destination catalogue: ${errors}`);
	}
	const ids = new Set<string>();
	for (const entry of data) {
		if (ids.has(entry.id)) throw new Error(`Duplicate destination id: ${entry.id}`);
		ids.add(entry.id);
	}
	const version = createHash('sha256').update(text).digest('hex').slice(0, 12);
	return { version, entries: data };
}

export async function loadCatalogue(path: string): Promise<Catalogue> {
	return parseCatalogue(await readFile(path, 'utf8'));
}

/** Destinations offered to users: published ones, plus drafts only when explicitly allowed. */
export function visibleEntries(catalogue: Catalogue, includeDrafts: boolean): CatalogueEntry[] {
	return catalogue.entries.filter((e) => e.status === 'published' || includeDrafts);
}

export function toDestination(entry: CatalogueEntry, locale: 'it' | 'en' = 'it'): Destination {
	return {
		id: entry.id,
		name: entry.name[locale],
		category: entry.category,
		entrance: entry.entrance,
		description: entry.description[locale],
		infoUrl: entry.infoUrl,
		checkedAt: entry.check.checkedAt,
		...(entry.accessNotes ? { accessNotes: entry.accessNotes[locale] } : {})
	};
}

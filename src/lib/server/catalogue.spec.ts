import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { parseCatalogue, toDestination } from './catalogue';

describe('destination catalogue', () => {
	it('the committed catalogue is valid and every entry converts to a contract Destination', () => {
		const catalogue = parseCatalogue(readFileSync('catalogue/destinations.yaml', 'utf8'));
		for (const e of catalogue.entries) {
			expect(validate('Destination', toDestination(e, 'it'))).toEqual({ ok: true });
			expect(validate('Destination', toDestination(e, 'en'))).toEqual({ ok: true });
		}
	});

	const valid = `- id: lake
  status: published
  name: { it: Lago, en: Lake }
  category: lake
  description: { it: d, en: d }
  entrance: { lat: 46.1, lon: 11.2 }
  infoUrl: https://example.org
  check: { checkedAt: 2026-09-25, checkedBy: me, coordinateSource: survey }
`;

	it('rejects duplicates, missing translations, insecure links and entrances outside the region', () => {
		expect(() => parseCatalogue(valid)).not.toThrow();
		expect(() => parseCatalogue(valid + valid)).toThrow(/Duplicate/);
		expect(() => parseCatalogue(valid.replace('en: Lake', 'fr: Lac'))).toThrow();
		expect(() => parseCatalogue(valid.replace('https://', 'http://'))).toThrow();
		expect(() => parseCatalogue(valid.replace('lat: 46.1', 'lat: 41.9'))).toThrow();
	});
});

import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { describe, expect, it } from 'vitest';
import { printLayers } from './basemap';

// CI has no basemap files, so the printed style never renders there: the validator is the
// check that MapLibre will accept it.
describe('printLayers', () => {
	it.each(['light', 'dark'] as const)('is a valid MapLibre style (%s)', (flavor) => {
		const style = {
			version: 8 as const,
			glyphs: 'https://example.org/{fontstack}/{range}.pbf',
			sources: { protomaps: { type: 'vector' as const, url: 'pmtiles://example.org/basemap.pmtiles' } },
			layers: printLayers(flavor, 'it')
		};
		expect(validateStyleMin(style)).toEqual([]);
	});
});

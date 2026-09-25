// Loads MapLibre with the self-hosted basemap (/basemap: PMTiles, fonts, sprites).
// Throws when the basemap or WebGL is unavailable so callers can show a text fallback.
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';
import { effectiveTheme } from '$lib/theme';

export type MapLibre = typeof import('maplibre-gl');

function webglAvailable(): boolean {
	try {
		return !!document.createElement('canvas').getContext('webgl2');
	} catch {
		return false;
	}
}

/** Paper and ink variants for the results map (DESIGN-BRIEF, "Tabellone"). */
const PAPER = {
	light: {
		background: '#ede9df',
		earth: '#ede9df',
		water: '#c7d3d6',
		wood_a: '#dfdfcf',
		wood_b: '#dcdccb',
		park_a: '#e0e0cf',
		park_b: '#dddccb',
		scrub_a: '#e2e0d1',
		scrub_b: '#e2e0d1',
		glacier: '#f7f5ef',
		boundaries: '#9b978d',
		city_label: '#111111',
		city_label_halo: '#ede9df',
		subplace_label: '#56544e',
		subplace_label_halo: '#ede9df'
	},
	dark: {
		background: '#111110',
		earth: '#161615',
		water: '#1f2a2d',
		wood_a: '#1b1c18',
		wood_b: '#1c1d19',
		park_a: '#1b1c18',
		park_b: '#1c1d19',
		scrub_a: '#191a17',
		scrub_b: '#191a17',
		glacier: '#23231f',
		boundaries: '#4a4842',
		city_label: '#ede9df',
		city_label_halo: '#111110',
		subplace_label: '#a9a59b',
		subplace_label_halo: '#111110'
	}
};

export interface BasemapMap {
	ml: MapLibre;
	map: MapLibreMap;
}

export async function createBasemapMap(
	container: HTMLElement,
	locale: 'it' | 'en',
	options: Omit<MapOptions, 'container' | 'style'>,
	look: 'auto' | 'paper' = 'auto'
): Promise<BasemapMap> {
	const meta = await fetch('/basemap/basemap.json');
	if (!meta.ok || !webglAvailable()) throw new Error('basemap unavailable');
	const { version, attribution } = (await meta.json()) as { version: string; attribution: string };

	const [ml, { Protocol }, basemaps, worker] = await Promise.all([
		import('maplibre-gl'),
		import('pmtiles'),
		import('@protomaps/basemaps'),
		import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
		import('maplibre-gl/dist/maplibre-gl.css')
	]);
	ml.setWorkerUrl(worker.default);
	const w = window as unknown as { __pmtilesProtocol?: boolean };
	if (!w.__pmtilesProtocol) {
		ml.addProtocol('pmtiles', new Protocol().tile);
		w.__pmtilesProtocol = true;
	}

	const flavor = effectiveTheme();
	const colors = look === 'paper' ? { ...basemaps.namedFlavor(flavor), ...PAPER[flavor] } : basemaps.namedFlavor(flavor);
	const origin = location.origin;
	const map = new ml.Map({
		...options,
		container,
		style: {
			version: 8,
			glyphs: `${origin}/basemap/fonts/{fontstack}/{range}.pbf`,
			sprite: `${origin}/basemap/sprites/v4/${flavor}`,
			sources: {
				protomaps: {
					type: 'vector',
					url: `pmtiles://${origin}/basemap/basemap.pmtiles?v=${version}`,
					attribution
				}
			},
			layers: basemaps.layers('protomaps', colors, { lang: locale })
		},
		attributionControl: { compact: true }
	});
	map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
	return { ml, map };
}

/** [minLon, minLat, maxLon, maxLat] of a list of [lon, lat] positions. */
export function boundsOf(coords: Array<[number, number]>): [number, number, number, number] | undefined {
	if (coords.length === 0) return undefined;
	return coords.reduce<[number, number, number, number]>(
		(b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
		[Infinity, Infinity, -Infinity, -Infinity]
	);
}

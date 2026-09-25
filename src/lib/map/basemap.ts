// Loads MapLibre with the self-hosted basemap (/basemap: PMTiles, fonts, sprites).
// Throws when the basemap or WebGL is unavailable so callers can show a text fallback.
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';
import type { LayerSpecification } from 'maplibre-gl';
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
	look: 'auto' | 'paper' | 'print' = 'auto'
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
			layers: look === 'print' ? printLayers(flavor, locale) : basemaps.layers('protomaps', colors, { lang: locale })
		},
		attributionControl: { compact: true }
	});
	if (options.interactive !== false) map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
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

/**
 * "Printed map" style for the home page reach map: paper, forests a shade darker so the
 * valleys read, lakes and rivers in grey-blue, railways in the old black-and-white pattern,
 * town names in spaced capitals. Only a few layers of the basemap, drawn in the site style.
 */
export function printLayers(flavor: 'light' | 'dark', locale: 'it' | 'en'): LayerSpecification[] {
	const c =
		flavor === 'light'
			? { paper: '#ede9df', forest: '#dedace', water: '#c3cfcd', waterEdge: '#8fa19e', road: '#d3cdbd', rail: '#111111', label: '#3d3b36' }
			: { paper: '#111110', forest: '#191a17', water: '#1d2729', waterEdge: '#3b4b4d', road: '#2a2a26', rail: '#ede9df', label: '#bdb8ad' };
	const name = ['coalesce', ['get', `name:${locale}`], ['get', 'name']];
	return [
		{ id: 'paper', type: 'background', paint: { 'background-color': c.paper } },
		{
			id: 'forest',
			type: 'fill',
			source: 'protomaps',
			'source-layer': 'landuse',
			filter: ['in', 'kind', 'forest', 'wood', 'scrub', 'nature_reserve', 'protected_area'],
			paint: { 'fill-color': c.forest }
		},
		{
			id: 'water',
			type: 'fill',
			source: 'protomaps',
			'source-layer': 'water',
			filter: ['==', '$type', 'Polygon'],
			paint: { 'fill-color': c.water, 'fill-outline-color': c.waterEdge }
		},
		{
			id: 'rivers',
			type: 'line',
			source: 'protomaps',
			'source-layer': 'water',
			filter: ['in', 'kind', 'river'],
			paint: { 'line-color': c.waterEdge, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 2.2] }
		},
		{
			id: 'roads',
			type: 'line',
			source: 'protomaps',
			'source-layer': 'roads',
			filter: ['in', 'kind', 'highway', 'major_road'],
			paint: { 'line-color': c.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 13, 2] }
		},
		{
			id: 'rail-base',
			type: 'line',
			source: 'protomaps',
			'source-layer': 'roads',
			filter: ['==', 'kind', 'rail'],
			paint: { 'line-color': c.rail, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.6, 13, 3.4] }
		},
		{
			id: 'rail-dash',
			type: 'line',
			source: 'protomaps',
			'source-layer': 'roads',
			filter: ['==', 'kind', 'rail'],
			paint: {
				'line-color': c.paper,
				'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 13, 1.8],
				'line-dasharray': [3, 3]
			}
		},
		{
			id: 'towns',
			type: 'symbol',
			source: 'protomaps',
			'source-layer': 'places',
			filter: ['all', ['==', 'kind', 'locality'], ['in', 'kind_detail', 'city', 'town']],
			layout: {
				'text-field': name as unknown as string,
				'text-font': ['Noto Sans Medium'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 13, 13],
				'text-transform': 'uppercase',
				'text-letter-spacing': 0.14,
				'text-max-width': 8
			},
			paint: { 'text-color': c.label, 'text-halo-color': c.paper, 'text-halo-width': 1.6 }
		}
	];
}

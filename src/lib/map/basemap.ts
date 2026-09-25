// Loads MapLibre with the self-hosted basemap (/basemap: PMTiles, fonts, sprites).
// Throws when the basemap or WebGL is unavailable so callers can show a text fallback.
import type { Map as MapLibreMap, MapOptions } from 'maplibre-gl';

export type MapLibre = typeof import('maplibre-gl');

function webglAvailable(): boolean {
	try {
		return !!document.createElement('canvas').getContext('webgl2');
	} catch {
		return false;
	}
}

export interface BasemapMap {
	ml: MapLibre;
	map: MapLibreMap;
}

export async function createBasemapMap(
	container: HTMLElement,
	locale: 'it' | 'en',
	options: Omit<MapOptions, 'container' | 'style'>
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

	const flavor = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
			layers: basemaps.layers('protomaps', basemaps.namedFlavor(flavor), { lang: locale })
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

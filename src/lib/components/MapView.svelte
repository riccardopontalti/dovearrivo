<script lang="ts">
	// Itinerary map, loaded on demand. Everything comes from our own server: the regional
	// PMTiles basemap, fonts and sprites under /basemap. Without WebGL or basemap files the
	// component says so and the textual itinerary stays the reference.
	import { onMount } from 'svelte';
	import type { Destination, Proposal } from '$lib/api/types';
	import { decodePolyline } from '$lib/geo/polyline';
	import type { Messages } from '$lib/i18n';

	let {
		proposal,
		destination,
		t,
		locale
	}: { proposal: Proposal; destination?: Destination; t: Messages; locale: 'it' | 'en' } = $props();

	let container: HTMLDivElement;
	let state = $state<'loading' | 'ready' | 'unavailable'>('loading');

	type Feature = GeoJSON.Feature<GeoJSON.LineString, { direction: string; walk: boolean }>;

	function features(): Feature[] {
		const out: Feature[] = [];
		for (const [direction, journey] of [
			['outbound', proposal.outbound],
			['inbound', proposal.inbound]
		] as const) {
			for (const leg of journey.legs) {
				// Legs without geometry are not drawn: a straight line would suggest a path
				// that the engine did not compute.
				if (!leg.geometry) continue;
				const coordinates = decodePolyline(leg.geometry.points, leg.geometry.precision);
				if (coordinates.length < 2) continue;
				out.push({
					type: 'Feature',
					properties: { direction, walk: leg.mode === 'WALK' },
					geometry: { type: 'LineString', coordinates }
				});
			}
		}
		return out;
	}

	function webglAvailable(): boolean {
		try {
			return !!document.createElement('canvas').getContext('webgl2');
		} catch {
			return false;
		}
	}

	onMount(() => {
		let map: { remove(): void } | undefined;
		let cancelled = false;

		(async () => {
			try {
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
				if (cancelled) return;
				ml.setWorkerUrl(worker.default);
				const w = window as unknown as { __pmtilesProtocol?: boolean };
				if (!w.__pmtilesProtocol) {
					ml.addProtocol('pmtiles', new Protocol().tile);
					w.__pmtilesProtocol = true;
				}

				const dark = matchMedia('(prefers-color-scheme: dark)').matches;
				const flavor = dark ? 'dark' : 'light';
				const origin = location.origin;
				const lines = features();
				const coords = lines.flatMap((f) => f.geometry.coordinates);
				if (destination) coords.push([destination.entrance.lon, destination.entrance.lat]);

				const instance = new ml.Map({
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
					bounds: coords.length
						? (coords.reduce(
								(b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
								[Infinity, Infinity, -Infinity, -Infinity]
							) as [number, number, number, number])
						: undefined,
					fitBoundsOptions: { padding: 36 },
					attributionControl: { compact: true }
				});
				map = instance;
				instance.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');

				instance.on('load', () => {
					const accent = getComputedStyle(container).getPropertyValue('--accent').trim() || '#0f6e5a';
					const returnColor = getComputedStyle(container).getPropertyValue('--return').trim() || '#b4531b';
					instance.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: lines } });
					instance.addLayer({
						id: 'route',
						type: 'line',
						source: 'route',
						layout: { 'line-cap': 'round', 'line-join': 'round' },
						paint: {
							'line-color': ['case', ['==', ['get', 'direction'], 'outbound'], accent, returnColor],
							'line-width': ['case', ['get', 'walk'], 3, 5],
							'line-dasharray': ['case', ['get', 'walk'], ['literal', [1, 1.5]], ['literal', [1, 0]]],
							'line-opacity': 0.9
						}
					});
					if (destination) {
						new ml.Marker({ color: accent })
							.setLngLat([destination.entrance.lon, destination.entrance.lat])
							.addTo(instance);
					}
					const start = proposal.outbound.legs[0]?.from.point;
					if (start) new ml.Marker({ color: '#555' }).setLngLat([start.lon, start.lat]).addTo(instance);
					state = 'ready';
				});
				instance.on('error', () => {
					if (state === 'loading') state = 'unavailable';
				});
			} catch {
				if (!cancelled) state = 'unavailable';
			}
		})();

		return () => {
			cancelled = true;
			map?.remove();
		};
	});
</script>

<div class="wrap">
	<div
		class="map"
		bind:this={container}
		role="img"
		aria-label={t.mapLabel}
		hidden={state === 'unavailable'}
	></div>
	{#if state === 'unavailable'}
		<p class="unavailable">{t.mapUnavailable}</p>
	{:else}
		<p class="legend">
			<span class="swatch out"></span>{t.outbound}
			<span class="swatch back"></span>{t.inbound}
			<span class="swatch walk"></span>{t.modeWalk}
		</p>
	{/if}
</div>

<style>
	.wrap {
		margin: 0.75rem 0;
	}
	.map {
		height: 18rem;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid var(--border);
		--return: #b4531b;
	}
	.unavailable {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.legend {
		display: flex;
		gap: 0.4rem 0.9rem;
		align-items: center;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0.4rem 0 0;
	}
	.swatch {
		display: inline-block;
		width: 1.4rem;
		height: 0.3rem;
		border-radius: 2px;
		margin-right: 0.3rem;
		vertical-align: middle;
	}
	.swatch.out {
		background: var(--accent);
	}
	.swatch.back {
		background: #b4531b;
	}
	.swatch.walk {
		background: repeating-linear-gradient(90deg, var(--muted) 0 3px, transparent 3px 6px);
	}
</style>

<script lang="ts">
	// Results map, loaded after the list: every proposed destination, and the outbound and
	// return of the chosen one drawn from the engine's geometry. Choosing a card flies here;
	// choosing a point on the map selects its card. Without WebGL or basemap the list stays
	// the reference and the panel says so.
	import { onMount } from 'svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Destination, Proposal } from '$lib/api/types';
	import { decodePolyline } from '$lib/geo/polyline';
	import type { Messages } from '$lib/i18n';
	import { boundsOf, createBasemapMap } from '$lib/map/basemap';
	import Backdrop from './Backdrop.svelte';

	let {
		proposals,
		destinations,
		selected,
		t,
		locale,
		onpick
	}: {
		proposals: Proposal[];
		destinations: Record<string, Destination>;
		selected?: string;
		t: Messages;
		locale: 'it' | 'en';
		onpick: (id: string) => void;
	} = $props();

	const OUT = '#2bb3a3';
	const BACK = '#ff9a62';

	let container: HTMLDivElement;
	let state = $state<'loading' | 'ready' | 'unavailable'>('loading');
	let map: MapLibreMap | undefined;

	type Line = GeoJSON.Feature<GeoJSON.LineString, { direction: string; walk: boolean }>;

	function routeOf(p: Proposal | undefined): Line[] {
		if (!p) return [];
		const out: Line[] = [];
		for (const [direction, journey] of [
			['outbound', p.outbound],
			['inbound', p.inbound]
		] as const) {
			for (const leg of journey.legs) {
				// Legs without geometry are not drawn: a straight line would suggest a path the
				// engine did not compute.
				if (!leg.geometry) continue;
				const coordinates = decodePolyline(leg.geometry.points, leg.geometry.precision);
				if (coordinates.length < 2) continue;
				out.push({ type: 'Feature', properties: { direction, walk: leg.mode === 'WALK' }, geometry: { type: 'LineString', coordinates } });
			}
		}
		return out;
	}

	function points(): GeoJSON.FeatureCollection<GeoJSON.Point> {
		return {
			type: 'FeatureCollection',
			features: proposals.flatMap((p) => {
				const d = destinations[p.destinationId];
				if (!d) return [];
				return [
					{
						type: 'Feature' as const,
						properties: { id: p.destinationId, name: d.name, selected: p.destinationId === selected },
						geometry: { type: 'Point' as const, coordinates: [d.entrance.lon, d.entrance.lat] }
					}
				];
			})
		};
	}

	function origin(): [number, number] | undefined {
		const start = proposals[0]?.outbound.legs[0]?.from.point;
		return start ? [start.lon, start.lat] : undefined;
	}

	function frame(animate: boolean) {
		if (!map) return;
		const chosen = proposals.find((p) => p.destinationId === selected);
		const coords: Array<[number, number]> = [];
		const o = origin();
		if (o) coords.push(o);
		if (chosen) {
			const d = destinations[chosen.destinationId];
			if (d) coords.push([d.entrance.lon, d.entrance.lat]);
			for (const f of routeOf(chosen)) coords.push(...(f.geometry.coordinates as Array<[number, number]>));
		} else {
			for (const f of points().features) coords.push(f.geometry.coordinates as [number, number]);
		}
		const bounds = boundsOf(coords);
		if (!bounds) return;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const wide = container.clientWidth > 700;
		map.fitBounds(bounds, {
			padding: wide ? 80 : 48,
			maxZoom: 13.5,
			duration: animate && !reduced ? 1400 : 0,
			essential: false
		});
	}

	$effect(() => {
		// Track the selection and the proposal list.
		void selected;
		void proposals;
		if (state !== 'ready' || !map) return;
		(map.getSource('dests') as { setData(d: unknown): void } | undefined)?.setData(points());
		(map.getSource('route') as { setData(d: unknown): void } | undefined)?.setData({
			type: 'FeatureCollection',
			features: routeOf(proposals.find((p) => p.destinationId === selected))
		});
		frame(true);
	});

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const coords = points().features.map((f) => f.geometry.coordinates as [number, number]);
				const o = origin();
				if (o) coords.push(o);
				const { map: instance } = await createBasemapMap(container, locale, { bounds: boundsOf(coords), fitBoundsOptions: { padding: 60, maxZoom: 12 } }, 'dusk');
				if (cancelled) return instance.remove();
				map = instance;
				instance.on('load', () => {
					instance.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
					instance.addSource('dests', { type: 'geojson', data: points() });
					if (o) instance.addSource('origin', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: o } } });
					instance.addLayer({
						id: 'route-glow',
						type: 'line',
						source: 'route',
						filter: ['!', ['get', 'walk']],
						layout: { 'line-cap': 'round', 'line-join': 'round' },
						paint: { 'line-color': ['case', ['==', ['get', 'direction'], 'outbound'], OUT, BACK], 'line-width': 12, 'line-opacity': 0.18, 'line-blur': 6 }
					});
					instance.addLayer({
						id: 'route',
						type: 'line',
						source: 'route',
						layout: { 'line-cap': 'round', 'line-join': 'round' },
						paint: {
							'line-color': ['case', ['==', ['get', 'direction'], 'outbound'], OUT, BACK],
							'line-width': ['case', ['get', 'walk'], 2.5, 4.5],
							'line-dasharray': ['case', ['get', 'walk'], ['literal', [1, 1.6]], ['literal', [1, 0]]]
						}
					});
					instance.addLayer({
						id: 'dests',
						type: 'circle',
						source: 'dests',
						paint: {
							'circle-radius': ['case', ['get', 'selected'], 9, 6],
							'circle-color': ['case', ['get', 'selected'], BACK, '#f6f4ef'],
							'circle-stroke-color': '#0f1b2d',
							'circle-stroke-width': 2.5
						}
					});
					instance.addLayer({
						id: 'dest-labels',
						type: 'symbol',
						source: 'dests',
						layout: {
							'text-field': ['get', 'name'],
							'text-font': ['Noto Sans Medium'],
							'text-size': ['case', ['get', 'selected'], 14, 12],
							'text-offset': [0, 1.2],
							'text-anchor': 'top',
							'text-max-width': 10,
							'text-optional': true
						},
						paint: { 'text-color': '#f6f4ef', 'text-halo-color': '#0f1b2d', 'text-halo-width': 1.6 }
					});
					if (o) {
						instance.addLayer({
							id: 'origin',
							type: 'circle',
							source: 'origin',
							paint: { 'circle-radius': 7, 'circle-color': '#0f1b2d', 'circle-stroke-color': OUT, 'circle-stroke-width': 3 }
						});
					}
					instance.on('click', 'dests', (e) => {
						const id = e.features?.[0]?.properties?.id;
						if (typeof id === 'string') onpick(id);
					});
					instance.on('mouseenter', 'dests', () => (instance.getCanvas().style.cursor = 'pointer'));
					instance.on('mouseleave', 'dests', () => (instance.getCanvas().style.cursor = ''));
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
			map = undefined;
		};
	});
</script>

<div class="wrap" class:ready={state === 'ready'}>
	<Backdrop />
	<div class="map" bind:this={container} role="img" aria-label={t.resultsMapLabel} hidden={state === 'unavailable'}></div>
	{#if state === 'unavailable'}
		<p class="note">{t.mapUnavailable}</p>
	{:else if state === 'ready'}
		<ul class="legend" aria-hidden="true">
			<li><span class="swatch out"></span>{t.outbound}</li>
			<li><span class="swatch back"></span>{t.inbound}</li>
			<li><span class="swatch walk"></span>{t.modeWalk}</li>
		</ul>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--night);
	}
	.map {
		position: absolute;
		inset: 0;
		opacity: 0;
		transition: opacity 500ms var(--ease);
	}
	.ready .map {
		opacity: 1;
	}
	.note {
		position: absolute;
		left: 1rem;
		right: 1rem;
		top: 1rem;
		margin: 0;
		max-width: 28rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgb(15 27 45 / 0.8);
		border: 1px solid rgb(255 255 255 / 0.12);
		color: var(--snow);
		font-size: 0.92rem;
		backdrop-filter: blur(8px);
	}
	.legend {
		position: absolute;
		left: 0.75rem;
		bottom: 0.75rem;
		display: flex;
		gap: 0.3rem 0.9rem;
		flex-wrap: wrap;
		margin: 0;
		padding: 0.4rem 0.75rem;
		list-style: none;
		border-radius: 999px;
		background: rgb(15 27 45 / 0.8);
		color: var(--snow);
		font-size: 0.8rem;
	}
	.swatch {
		display: inline-block;
		width: 1.2rem;
		height: 0.28rem;
		border-radius: 2px;
		margin-right: 0.35rem;
		vertical-align: middle;
	}
	.out {
		background: #2bb3a3;
	}
	.back {
		background: #ff9a62;
	}
	.walk {
		background: repeating-linear-gradient(90deg, #c9d3de 0 3px, transparent 3px 6px);
	}
</style>

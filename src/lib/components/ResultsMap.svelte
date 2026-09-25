<script lang="ts">
	// Results map, loaded after the list: every proposed destination, and the outbound (ink)
	// and return (signal yellow, ink edge) of the chosen one, drawn from the engine's
	// geometry. Choosing a card flies here; choosing a point selects its card. The map is
	// rebuilt when the theme changes. Without WebGL or basemap the list stays the reference.
	import { onMount } from 'svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Destination, Proposal } from '$lib/api/types';
	import { decodePolyline } from '$lib/geo/polyline';
	import type { Messages } from '$lib/i18n';
	import { boundsOf, createBasemapMap } from '$lib/map/basemap';
	import { effectiveTheme } from '$lib/theme';

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

	const SIGNAL = '#ffc700';

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
		map.fitBounds(bounds, {
			padding: container.clientWidth > 700 ? 90 : 48,
			maxZoom: 13.5,
			duration: animate && !reduced ? 1600 : 0,
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

	async function build(): Promise<void> {
		const dark = effectiveTheme() === 'dark';
		const ink = dark ? '#ede9df' : '#111111';
		const paper = dark ? '#111110' : '#ede9df';
		const coords = points().features.map((f) => f.geometry.coordinates as [number, number]);
		const o = origin();
		if (o) coords.push(o);
		const { map: instance } = await createBasemapMap(container, locale, { bounds: boundsOf(coords), fitBoundsOptions: { padding: 60, maxZoom: 12 } }, 'paper');
		map = instance;
		instance.on('load', () => {
			instance.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
			instance.addSource('dests', { type: 'geojson', data: points() });
			if (o) instance.addSource('origin', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: o } } });
			// Return first, so the outbound draws above it where they share a road.
			instance.addLayer({
				id: 'route-edge',
				type: 'line',
				source: 'route',
				filter: ['all', ['==', ['get', 'direction'], 'inbound'], ['!', ['get', 'walk']]],
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': dark ? '#111110' : '#111111', 'line-width': 9 }
			});
			instance.addLayer({
				id: 'route',
				type: 'line',
				source: 'route',
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': ['case', ['==', ['get', 'direction'], 'outbound'], ink, SIGNAL],
					'line-width': ['case', ['get', 'walk'], 2.5, ['==', ['get', 'direction'], 'outbound'], 3.5, 6],
					'line-dasharray': ['case', ['get', 'walk'], ['literal', [1, 1.6]], ['literal', [1, 0]]]
				}
			});
			instance.addLayer({
				id: 'dests',
				type: 'circle',
				source: 'dests',
				paint: {
					'circle-radius': ['case', ['get', 'selected'], 10, 6],
					'circle-color': ['case', ['get', 'selected'], SIGNAL, paper],
					'circle-stroke-color': ink,
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
					'text-size': ['case', ['get', 'selected'], 15, 12],
					'text-offset': [0, 1.3],
					'text-anchor': 'top',
					'text-max-width': 10,
					'text-optional': true
				},
				paint: { 'text-color': ink, 'text-halo-color': paper, 'text-halo-width': 2 }
			});
			if (o) {
				instance.addLayer({
					id: 'origin',
					type: 'circle',
					source: 'origin',
					paint: { 'circle-radius': 8, 'circle-color': ink, 'circle-stroke-color': paper, 'circle-stroke-width': 3 }
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
	}

	onMount(() => {
		let cancelled = false;
		const start = () =>
			build().catch(() => {
				if (!cancelled) state = 'unavailable';
			});
		start();
		// Rebuild with the other palette when the theme changes.
		const themeWatch = new MutationObserver(() => {
			if (state === 'unavailable') return;
			map?.remove();
			map = undefined;
			state = 'loading';
			start();
		});
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => {
			cancelled = true;
			themeWatch.disconnect();
			map?.remove();
			map = undefined;
		};
	});
</script>

<div class="wrap" class:ready={state === 'ready'}>
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
		background: var(--paper);
		background-image:
			linear-gradient(var(--hair) 1px, transparent 1px),
			linear-gradient(90deg, var(--hair) 1px, transparent 1px);
		background-size: 48px 48px;
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
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 0.92rem;
		box-shadow: 5px 5px 0 var(--ink);
	}
	.legend {
		position: absolute;
		left: 0.75rem;
		bottom: 0.75rem;
		display: flex;
		gap: 0.3rem 0.9rem;
		flex-wrap: wrap;
		margin: 0;
		padding: 0.45rem 0.8rem;
		list-style: none;
		border: 1.5px solid var(--rule);
		border-radius: 999px;
		background: var(--surface);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.swatch {
		display: inline-block;
		width: 1.3rem;
		height: 0.35rem;
		margin-right: 0.35rem;
		vertical-align: middle;
	}
	.out {
		background: var(--ink);
	}
	.back {
		height: 0.5rem;
		background: var(--signal);
		box-shadow: inset 0 0 0 1.5px #111;
	}
	.walk {
		background: repeating-linear-gradient(90deg, var(--ink) 0 3px, transparent 3px 6px);
	}
</style>

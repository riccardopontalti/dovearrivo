<script lang="ts">
	// Reachable stops as dots coloured by time band, with a hover tooltip. The table on the
	// page is the text alternative; without WebGL or basemap the map says so.
	import { onMount } from 'svelte';
	import type { Reachability } from '$lib/api/types';
	import type { Messages } from '$lib/i18n';
	import { boundsOf, createBasemapMap } from '$lib/map/basemap';
	import { BAND_COLORS, bandOf } from '$lib/reach-bands';

	let {
		result,
		origin,
		t,
		locale
	}: { result: Reachability; origin?: { lat: number; lon: number }; t: Messages; locale: 'it' | 'en' } = $props();

	let container: HTMLDivElement;
	let state = $state<'loading' | 'ready' | 'unavailable'>('loading');

	onMount(() => {
		let map: { remove(): void } | undefined;
		let cancelled = false;
		(async () => {
			try {
				const coords = result.places.map((p) => [p.point.lon, p.point.lat] as [number, number]);
				if (origin) coords.push([origin.lon, origin.lat]);
				const { ml, map: instance } = await createBasemapMap(container, locale, {
					bounds: boundsOf(coords),
					fitBoundsOptions: { padding: 30, maxZoom: 13 }
				});
				if (cancelled) return instance.remove();
				map = instance;
				const dark = matchMedia('(prefers-color-scheme: dark)').matches;
				const colors = dark ? BAND_COLORS.dark : BAND_COLORS.light;
				const surface = getComputedStyle(container).getPropertyValue('--surface').trim() || '#ffffff';

				instance.on('load', () => {
					instance.addSource('reach', {
						type: 'geojson',
						data: {
							type: 'FeatureCollection',
							features: result.places.map((p) => ({
								type: 'Feature',
								properties: { name: p.name, minutes: p.minutes, transfers: p.transfers, band: bandOf(p.minutes) },
								geometry: { type: 'Point', coordinates: [p.point.lon, p.point.lat] }
							}))
						}
					});
					instance.addLayer({
						id: 'reach',
						type: 'circle',
						source: 'reach',
						// Nearest first on top: later features draw above earlier ones.
						layout: { 'circle-sort-key': ['-', 0, ['get', 'minutes']] },
						paint: {
							'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 13, 6],
							'circle-color': ['match', ['get', 'band'], 0, colors[0], 1, colors[1], 2, colors[2], 3, colors[3], colors[4]],
							'circle-stroke-color': surface,
							'circle-stroke-width': 2
						}
					});
					if (origin) new ml.Marker({ color: '#555' }).setLngLat([origin.lon, origin.lat]).addTo(instance);

					const popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
					instance.on('mousemove', 'reach', (e) => {
						const f = e.features?.[0];
						if (!f) return;
						instance.getCanvas().style.cursor = 'pointer';
						const p = f.properties as { name: string; minutes: number; transfers: number };
						const el = document.createElement('div');
						const strong = document.createElement('strong');
						strong.textContent = p.name;
						el.append(strong, document.createElement('br'), `${p.minutes} min · ${p.transfers} ${t.transfersShort}`);
						popup.setLngLat(e.lngLat).setDOMContent(el).addTo(instance);
					});
					instance.on('mouseleave', 'reach', () => {
						instance.getCanvas().style.cursor = '';
						popup.remove();
					});
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

<div class="map" bind:this={container} role="img" aria-label={t.reachMapLabel} hidden={state === 'unavailable'}></div>
{#if state === 'unavailable'}<p class="muted">{t.reachMapUnavailable}</p>{/if}

<style>
	.map {
		height: min(70vh, 34rem);
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.muted {
		color: var(--muted);
	}
</style>

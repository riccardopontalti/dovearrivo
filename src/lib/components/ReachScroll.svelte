<script lang="ts">
	// "How far you get in 90 minutes": real one-to-all arrivals from /bloom, scrubbed by the
	// scroll position. The section pins while the clock runs from 0 to 90 minutes: the stops
	// appear in arrival order on a printed-style map of Trentino (our basemap), which starts
	// close on the origin and opens up as time passes. Without the basemap or WebGL the stops
	// are drawn on a plain map frame. With reduced motion it shows the final state and does
	// not pin. The counter and a sentence are the text version.
	import { onMount } from 'svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import type { Destination } from '$lib/api/types';
	import { fill, type Messages } from '$lib/i18n';
	import { boundsOf, createBasemapMap } from '$lib/map/basemap';
	import { effectiveTheme } from '$lib/theme';

	interface Bloom {
		origin: { name: string; point: { lat: number; lon: number } };
		departAfter: string;
		minutes: number;
		points: number[];
	}

	let { t, locale, destinations }: { t: Messages; locale: 'it' | 'en'; destinations: Destination[] } = $props();

	const FRESH = 6;
	let section = $state<HTMLElement>();
	let mapEl = $state<HTMLDivElement>();
	let canvas = $state<HTMLCanvasElement>();
	let copy = $state<HTMLElement>();
	let bloom = $state<Bloom | null>(null);
	let minutes = $state(0);
	let progress = $state(0);
	let still = $state(false);
	let mode = $state<'loading' | 'map' | 'canvas'>('loading');

	const reached = $derived.by(() => {
		if (!bloom) return 0;
		let n = 0;
		for (let i = 2; i < bloom.points.length; i += 3) if (bloom.points[i] <= minutes) n++;
		return n;
	});
	const nf = $derived(new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-GB'));
	const romeToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let frame = 0;
		let cancelled = false;
		let map: MapLibreMap | undefined;
		type Cam = { center: [number, number]; zoom: number };
		let camera: { start: Cam; end: Cam } | undefined;
		let project: ((lon: number, lat: number) => [number, number]) | undefined;
		let focus: [number, number] = [0, 0];

		const ease = (p: number) => 1 - Math.pow(1 - p, 2.2);

		// ---------- map mode ----------
		async function startMap(b: Bloom) {
			const features: Array<GeoJSON.Feature<GeoJSON.Point, { m: number }>> = [];
			for (let i = 0; i < b.points.length; i += 3) {
				features.push({ type: 'Feature' as const, properties: { m: b.points[i + 2] }, geometry: { type: 'Point' as const, coordinates: [b.points[i], b.points[i + 1]] } });
			}
			const all = boundsOf(features.map((f) => f.geometry.coordinates as [number, number]))!;
			const dark = effectiveTheme() === 'dark';
			const ink = dark ? '#ede9df' : '#111111';
			const paper = dark ? '#111110' : '#ede9df';
			const { map: m } = await createBasemapMap(mapEl!, locale, { bounds: all, interactive: false, fadeDuration: 0 }, 'print');
			if (cancelled) return m.remove();
			map = m;
			m.on('load', () => {
				m.addSource('stops', { type: 'geojson', data: { type: 'FeatureCollection', features } });
				m.addSource('dests', {
					type: 'geojson',
					data: {
						type: 'FeatureCollection',
						features: destinations.map((d) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [d.entrance.lon, d.entrance.lat] } }))
					}
				});
				m.addSource('origin', {
					type: 'geojson',
					data: { type: 'Feature', properties: { name: b.origin.name.toUpperCase() }, geometry: { type: 'Point', coordinates: [b.origin.point.lon, b.origin.point.lat] } }
				});
				m.addLayer({
					id: 'stops-old',
					type: 'circle',
					source: 'stops',
					filter: ['<', ['get', 'm'], -1],
					paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.8, 13, 3.5], 'circle-color': ink }
				});
				m.addLayer({
					id: 'stops-new',
					type: 'circle',
					source: 'stops',
					filter: ['<', ['get', 'm'], -1],
					paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 13, 6], 'circle-color': '#ffc700', 'circle-stroke-color': '#111', 'circle-stroke-width': 1.2 }
				});
				m.addLayer({
					id: 'dests',
					type: 'circle',
					source: 'dests',
					paint: { 'circle-radius': 5, 'circle-color': paper, 'circle-stroke-color': ink, 'circle-stroke-width': 2 }
				});
				m.addLayer({
					id: 'origin',
					type: 'circle',
					source: 'origin',
					paint: { 'circle-radius': 9, 'circle-color': '#ffc700', 'circle-stroke-color': '#111', 'circle-stroke-width': 3 }
				});
				m.addLayer({
					id: 'origin-label',
					type: 'symbol',
					source: 'origin',
					layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Medium'], 'text-size': 14, 'text-letter-spacing': 0.14, 'text-offset': [0, -1.6], 'text-anchor': 'bottom' },
					paint: { 'text-color': ink, 'text-halo-color': paper, 'text-halo-width': 2 }
				});
				layoutCamera();
				mode = 'map';
				schedule();
			});
			m.on('error', () => {
				if (mode === 'loading') fallback();
			});
		}

		function layoutCamera() {
			if (!map || !bloom) return;
			const wide = innerWidth > 800;
			const c = copy?.getBoundingClientRect();
			const padding = wide
				? { top: 60, bottom: 60, left: Math.min((c?.right ?? 400) + 30, innerWidth * 0.5), right: 70 }
				: { top: Math.min((c?.height ?? 200) + 40, innerHeight * 0.45), bottom: 80, left: 18, right: 48 };
			const coords: Array<[number, number]> = [];
			for (let i = 0; i < bloom.points.length; i += 3) coords.push([bloom.points[i], bloom.points[i + 1]]);
			const end = map.cameraForBounds(boundsOf(coords)!, { padding });
			if (!end) return;
			const c2 = end.center as { lng: number; lat: number };
			const zoom = end.zoom ?? 9;
			camera = {
				start: { center: [bloom.origin.point.lon, bloom.origin.point.lat], zoom: zoom + 2.4 },
				end: { center: [c2.lng, c2.lat], zoom }
			};
		}

		function drawMap() {
			if (!map || !camera || !bloom) return;
			const done = minutes >= bloom.minutes;
			map.setFilter('stops-old', ['<=', ['get', 'm'], done ? minutes : minutes - FRESH]);
			map.setFilter('stops-new', done ? ['<', ['get', 'm'], -1] : ['all', ['>', ['get', 'm'], minutes - FRESH], ['<=', ['get', 'm'], minutes]]);
			const e = ease(progress);
			const { start, end } = camera;
			map.jumpTo({
				center: [start.center[0] + (end.center[0] - start.center[0]) * e, start.center[1] + (end.center[1] - start.center[1]) * e],
				zoom: start.zoom + (end.zoom - start.zoom) * e
			});
		}

		// ---------- canvas fallback ----------
		function fallback() {
			map?.remove();
			map = undefined;
			mode = 'canvas';
			requestAnimationFrame(() => {
				layoutCanvas();
				schedule();
			});
		}

		function layoutCanvas() {
			if (!canvas || !bloom) return;
			const dpr = Math.min(2, devicePixelRatio || 1);
			const box = canvas.getBoundingClientRect();
			canvas.width = Math.round(box.width * dpr);
			canvas.height = Math.round(box.height * dpr);
			canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
			const o = bloom.origin.point;
			const k = Math.cos((o.lat * Math.PI) / 180);
			let [x0, y0, x1, y1] = [o.lon * k, -o.lat, o.lon * k, -o.lat];
			for (let i = 0; i < bloom.points.length; i += 3) {
				x0 = Math.min(x0, bloom.points[i] * k);
				x1 = Math.max(x1, bloom.points[i] * k);
				y0 = Math.min(y0, -bloom.points[i + 1]);
				y1 = Math.max(y1, -bloom.points[i + 1]);
			}
			const wide = box.width > 800;
			const c = copy?.getBoundingClientRect();
			const right = c?.right ?? box.width * 0.36;
			const h = c?.height ?? 200;
			const rect = wide
				? { x: right + 40, y: box.height * 0.1, w: box.width - right - 110, h: box.height * 0.8 }
				: { x: box.width * 0.05, y: h + 50, w: box.width * 0.8, h: box.height - h - 140 };
			const scale = Math.min(rect.w / Math.max(x1 - x0, 0.05), rect.h / Math.max(y1 - y0, 0.05));
			const ox = rect.x + (rect.w - (x1 - x0) * scale) / 2;
			const oy = rect.y + (rect.h - (y1 - y0) * scale) / 2;
			const base = (lon: number, lat: number): [number, number] => [ox + (lon * k - x0) * scale, oy + (-lat - y0) * scale];
			// Like the map: start close on the origin, open up to the whole area with time.
			const o0 = base(o.lon, o.lat);
			focus = [rect.x + rect.w / 2, rect.y + rect.h / 2];
			project = (lon, lat) => {
				const e = ease(progress);
				const z = 1 + 1.6 * (1 - e);
				const [x, y] = base(lon, lat);
				const cx = o0[0] + (focus[0] - o0[0]) * (1 - e);
				const cy = o0[1] + (focus[1] - o0[1]) * (1 - e);
				return [cx + (x - o0[0]) * z, cy + (y - o0[1]) * z];
			};
		}

		function drawCanvas() {
			if (!canvas || !bloom || !project) return;
			const ctx = canvas.getContext('2d')!;
			const css = getComputedStyle(canvas);
			const ink = css.getPropertyValue('--ink').trim() || '#111';
			const hair = css.getPropertyValue('--hair').trim() || 'rgba(0,0,0,.14)';
			const box = canvas.getBoundingClientRect();
			ctx.clearRect(0, 0, box.width, box.height);
			// A map frame: graticule every 0.1 degrees.
			ctx.strokeStyle = hair;
			ctx.globalAlpha = 0.5;
			ctx.lineWidth = 1;
			for (let lon = 10.3; lon <= 12.5; lon += 0.1) {
				const [x] = project(lon, 46);
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, box.height);
				ctx.stroke();
			}
			for (let lat = 45.5; lat <= 47; lat += 0.1) {
				const [, y] = project(11, lat);
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(box.width, y);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			const p = bloom.points;
			const done = minutes >= bloom.minutes;
			ctx.fillStyle = ink;
			for (let i = 0; i < p.length; i += 3) {
				if (p[i + 2] > minutes) break;
				if (!done && p[i + 2] > minutes - FRESH) continue;
				const [x, y] = project(p[i], p[i + 1]);
				ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
			}
			if (!done) {
				ctx.fillStyle = '#ffc700';
				ctx.strokeStyle = '#111';
				ctx.lineWidth = 1;
				for (let i = 0; i < p.length; i += 3) {
					if (p[i + 2] > minutes) break;
					if (p[i + 2] <= minutes - FRESH) continue;
					const [x, y] = project(p[i], p[i + 1]);
					ctx.beginPath();
					ctx.arc(x, y, 3.5, 0, Math.PI * 2);
					ctx.fill();
					ctx.stroke();
				}
			}
			ctx.strokeStyle = ink;
			ctx.lineWidth = 1.5;
			for (const d of destinations) {
				const [x, y] = project(d.entrance.lon, d.entrance.lat);
				ctx.strokeRect(x - 4, y - 4, 8, 8);
			}
			const [x, y] = project(bloom.origin.point.lon, bloom.origin.point.lat);
			ctx.fillStyle = '#ffc700';
			ctx.beginPath();
			ctx.arc(x, y, 7, 0, Math.PI * 2);
			ctx.fill();
			ctx.lineWidth = 2.5;
			ctx.strokeStyle = '#111';
			ctx.stroke();
			ctx.fillStyle = ink;
			ctx.font = `700 13px ${css.getPropertyValue('--font-mono')}`;
			ctx.fillText(bloom.origin.name.toUpperCase(), x + 12, y - 10);
		}

		// ---------- scroll ----------
		function update() {
			frame = 0;
			if (!section || !bloom) return;
			if (still) progress = 1;
			else {
				const r = section.getBoundingClientRect();
				progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
			}
			minutes = Math.round(progress * bloom.minutes);
			if (mode === 'map') drawMap();
			else if (mode === 'canvas') drawCanvas();
		}
		const schedule = () => (frame ||= requestAnimationFrame(update));

		const resize = new ResizeObserver(() => {
			if (mode === 'map') {
				map?.resize();
				layoutCamera();
			} else if (mode === 'canvas') layoutCanvas();
			schedule();
		});
		// Rebuild the map in the other palette when the theme changes.
		const themeWatch = new MutationObserver(() => {
			if (mode === 'map' && bloom) {
				map?.remove();
				map = undefined;
				mode = 'loading';
				startMap(bloom).catch(fallback);
			} else schedule();
		});
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		// Data now (it is small); the map library only when the section gets close.
		let near = false;
		const approach = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting) || near || !bloom) return;
				near = true;
				approach.disconnect();
				startMap(bloom).catch(fallback);
			},
			{ rootMargin: '800px 0px' }
		);

		fetch('/bloom')
			.then((r) => r.json())
			.then((body: Bloom | { unavailable: true }) => {
				if (cancelled || 'unavailable' in body || body.points.length === 0) return;
				bloom = body;
				requestAnimationFrame(() => {
					if (!section) return;
					resize.observe(section);
					approach.observe(section);
				});
			})
			.catch(() => {});
		addEventListener('scroll', schedule, { passive: true });
		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			removeEventListener('scroll', schedule);
			resize.disconnect();
			approach.disconnect();
			themeWatch.disconnect();
			map?.remove();
		};
	});
</script>

{#if bloom}
	<section class="reach" class:still bind:this={section} aria-labelledby="reach-title">
		<div class="pin">
			<div class="map" bind:this={mapEl} class:shown={mode === 'map'} aria-hidden="true"></div>
			<canvas bind:this={canvas} class:shown={mode === 'canvas'} aria-hidden="true"></canvas>
			<div class="copy" bind:this={copy}>
				<h2 id="reach-title">{t.reachTitleHome}</h2>
				<p class="hint">{t.reachScrollHint}</p>
				<p class="counter">
					<span class="big">{fill(t.reachCounter, { m: minutes })}</span>
					<span class="stops">{fill(t.reachStops, { n: nf.format(reached) })}</span>
				</p>
				<p class="visually-hidden">
					{fill(bloom.departAfter.slice(0, 10) > romeToday() ? t.bloomTomorrow : t.bloomToday, {
						origin: bloom.origin.name,
						time: bloom.departAfter.slice(11, 16),
						n: nf.format(bloom.points.length / 3),
						minutes: bloom.minutes
					})}
				</p>
			</div>
			<div class="rail" aria-hidden="true">
				<span class="rail-fill" style="transform:scaleY({progress})"></span>
				{#each [0, 30, 60, 90] as m (m)}<span class="tick" style="--at:{m / 90}">{m}′</span>{/each}
			</div>
			{#if !still}
				<p class="scroll-cue" class:gone={progress > 0.04} aria-hidden="true">
					<span>{t.reachScrollCue}</span>
					<svg viewBox="0 0 24 24" width="22" height="22"
						><path d="M12 4v15m-6-6 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg
					>
				</p>
			{/if}
		</div>
	</section>
{/if}

<style>
	.reach {
		position: relative;
		height: 320vh;
		border-top: 1.5px solid var(--rule);
	}
	.reach.still {
		height: auto;
	}
	.pin {
		position: sticky;
		top: 0;
		height: 100svh;
		overflow: hidden;
		background: var(--paper);
	}
	.still .pin {
		position: relative;
	}
	.map,
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		transition: opacity 600ms var(--ease);
	}
	.shown {
		opacity: 1;
	}
	.copy {
		position: absolute;
		z-index: 2;
		top: clamp(1rem, 4vw, 3rem);
		left: clamp(1rem, 3vw, 2.5rem);
		max-width: 24rem;
		padding: 1.1rem 1.2rem 1.2rem;
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 6px 6px 0 var(--ink);
	}
	h2 {
		margin: 0;
		font-size: clamp(1.9rem, 4vw, 3.2rem);
	}
	.hint {
		margin: 0.6rem 0 0;
		color: var(--muted);
		font-size: 0.92rem;
	}
	.counter {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 0.75rem;
		margin: 1rem 0 0;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.big {
		font-size: clamp(1.7rem, 4vw, 2.8rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.stops {
		padding: 0.1rem 0.45rem;
		background: var(--signal);
		color: #111;
		font-weight: 600;
	}
	/* Time rail on the right edge: 0 to 90 minutes. */
	.rail {
		position: absolute;
		z-index: 2;
		top: 14%;
		bottom: 14%;
		right: clamp(0.9rem, 2.5vw, 2rem);
		width: 8px;
		border: 1.5px solid var(--rule);
		border-radius: 8px;
		background: var(--surface);
	}
	.rail-fill {
		position: absolute;
		inset: 0;
		border-radius: 8px;
		background: var(--signal);
		transform-origin: top;
	}
	.tick {
		position: absolute;
		right: 16px;
		top: calc(var(--at) * 100%);
		transform: translateY(-50%);
		padding: 0 0.2rem;
		background: var(--paper);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 600;
	}
	.scroll-cue {
		position: absolute;
		z-index: 2;
		left: 50%;
		bottom: clamp(1rem, 5vh, 2.5rem);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		padding: 0.6rem 1.1rem;
		transform: translateX(-50%);
		border: 1.5px solid #111;
		border-radius: 999px;
		background: var(--signal);
		color: #111;
		font-weight: 700;
		white-space: nowrap;
		box-shadow: 4px 4px 0 #111;
		transition:
			opacity 300ms var(--ease),
			transform 300ms var(--ease);
	}
	.scroll-cue svg {
		animation: nudge 1.2s var(--ease-in-out) infinite;
	}
	.scroll-cue.gone {
		opacity: 0;
		transform: translate(-50%, 12px);
		pointer-events: none;
	}
	@keyframes nudge {
		50% {
			transform: translateY(5px);
		}
	}
	@media (max-width: 800px) {
		.rail {
			top: 34%;
			bottom: 16%;
		}
		.copy {
			right: 1rem;
			max-width: none;
			padding: 0.8rem 0.9rem;
			box-shadow: 4px 4px 0 var(--ink);
		}
		.hint {
			display: none;
		}
		.counter {
			margin-top: 0.6rem;
		}
	}
</style>

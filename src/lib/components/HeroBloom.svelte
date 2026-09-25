<script lang="ts">
	// Home page bloom: real one-to-all arrivals from /bloom, replayed once in arrival order on
	// a canvas (no map library, so the first screen stays light). The stops trace the valleys.
	// With reduced motion the final state is drawn at once. The caption is the text version.
	import { onMount } from 'svelte';
	import type { Destination } from '$lib/api/types';
	import { clock, localDate } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import { clockLabel } from '$lib/ribbon';

	let {
		t,
		locale,
		destinations,
		stage
	}: { t: Messages; locale: 'it' | 'en'; destinations: Destination[]; stage?: HTMLElement } = $props();

	interface Bloom {
		origin: { name: string; point: { lat: number; lon: number } };
		departAfter: string;
		minutes: number;
		points: number[];
	}

	// Ordinal ramp on the dusk surface #0f1b2d, nearest brightest (validated with the dataviz
	// ordinal checks: monotone lightness, single hue, far end 4.5:1 on the surface).
	const BANDS = [30, 60, 90];
	const COLORS = ['#ffe0b8', '#ff9a62', '#d0603c'];
	const DURATION = 2600;
	const FADE = 380;

	let host: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let bloom = $state<Bloom | null>(null);
	let elapsed = $state(0);
	let originAt = $state<{ x: number; y: number } | null>(null);

	const count = $derived(bloom ? bloom.points.length / 3 : 0);
	const departClock = $derived(bloom ? clock(bloom.departAfter) : '');
	const caption = $derived.by(() => {
		if (!bloom) return '';
		const template = localDate(bloom.departAfter) === localDate(Date.now()) ? t.bloomToday : t.bloomTomorrow;
		return fill(template, { origin: bloom.origin.name, time: departClock, n: count.toLocaleString(locale === 'it' ? 'it-IT' : 'en-GB'), minutes: bloom.minutes });
	});
	const liveClock = $derived.by(() => {
		if (!bloom) return '';
		const [h, m] = departClock.split(':').map(Number);
		return clockLabel(h * 60 + m + Math.round(Math.min(1, elapsed / DURATION) * bloom.minutes));
	});

	function bandOf(minutes: number): number {
		const i = BANDS.findIndex((b) => minutes <= b);
		return i < 0 ? BANDS.length - 1 : i;
	}

	function sprite(color: string, size: number): HTMLCanvasElement {
		const c = document.createElement('canvas');
		c.width = c.height = size;
		const g = c.getContext('2d')!;
		const r = size / 2;
		const grad = g.createRadialGradient(r, r, 0, r, r, r);
		grad.addColorStop(0, color);
		grad.addColorStop(0.25, `${color}aa`);
		grad.addColorStop(1, `${color}00`);
		g.fillStyle = grad;
		g.fillRect(0, 0, size, size);
		return c;
	}

	onMount(() => {
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const glows = COLORS.map((c) => sprite(c, 48));
		let project: ((lon: number, lat: number) => [number, number]) | undefined;
		let glowArea = 1;
		let frame = 0;
		let started = 0;
		let cancelled = false;

		function layout() {
			const dpr = Math.min(2, devicePixelRatio || 1);
			const box = host.getBoundingClientRect();
			canvas.width = Math.round(box.width * dpr);
			canvas.height = Math.round(box.height * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			if (!bloom) return;
			const area = (stage ?? host).getBoundingClientRect();
			const rect = { x: area.left - box.left, y: area.top - box.top, w: area.width, h: area.height };
			const o = bloom.origin.point;
			const k = Math.cos((o.lat * Math.PI) / 180);
			let [x0, y0, x1, y1] = [o.lon * k, -o.lat, o.lon * k, -o.lat];
			for (let i = 0; i < bloom.points.length; i += 3) {
				const x = bloom.points[i] * k;
				const y = -bloom.points[i + 1];
				x0 = Math.min(x0, x);
				x1 = Math.max(x1, x);
				y0 = Math.min(y0, y);
				y1 = Math.max(y1, y);
			}
			glowArea = rect.w * rect.h;
			const scale = Math.min(rect.w / Math.max(x1 - x0, 0.05), rect.h / Math.max(y1 - y0, 0.05));
			const ox = rect.x + (rect.w - (x1 - x0) * scale) / 2;
			const oy = rect.y + (rect.h - (y1 - y0) * scale) / 2;
			project = (lon, lat) => [ox + (lon * k - x0) * scale, oy + (-lat - y0) * scale];
			const [px, py] = project(o.lon, o.lat);
			originAt = { x: px, y: py };
		}

		function draw(time: number) {
			if (!bloom || !project) return;
			const w = canvas.width;
			const h = canvas.height;
			ctx!.clearRect(0, 0, w, h);
			ctx!.globalCompositeOperation = 'lighter';
			const p = bloom.points;
			// Dense areas saturate with additive glow: shrink and dim it with density.
			const density = Math.min(1, Math.sqrt((glowArea / Math.max(1, p.length / 3)) / 900));
			const glowSize = 8 + 10 * density;
			const glowAlpha = 0.12 + 0.3 * density;
			for (let i = 0; i < p.length; i += 3) {
				const appear = (p[i + 2] / bloom.minutes) * DURATION;
				if (time < appear) break; // points are sorted by arrival
				const a = Math.min(1, (time - appear) / FADE);
				const band = bandOf(p[i + 2]);
				const [x, y] = project(p[i], p[i + 1]);
				const size = glowSize + (1 - a) * 16;
				ctx!.globalAlpha = glowAlpha * a;
				ctx!.drawImage(glows[band], x - size / 2, y - size / 2, size, size);
				ctx!.globalAlpha = a;
				ctx!.fillStyle = COLORS[band];
				ctx!.fillRect(x - 1, y - 1, 2, 2);
			}
			ctx!.globalCompositeOperation = 'source-over';
			// Origin ripple, once.
			const [ox, oy] = project(bloom.origin.point.lon, bloom.origin.point.lat);
			if (time < 1200) {
				const r = 6 + (time / 1200) * 60;
				ctx!.globalAlpha = 1 - time / 1200;
				ctx!.strokeStyle = '#ffe0b8';
				ctx!.lineWidth = 1.5;
				ctx!.beginPath();
				ctx!.arc(ox, oy, r, 0, Math.PI * 2);
				ctx!.stroke();
			}
			// Destinations of the catalogue as small diamonds, after the bloom.
			const d = Math.max(0, Math.min(1, (time - DURATION * 0.8) / 500));
			if (d > 0) {
				ctx!.globalAlpha = d;
				ctx!.strokeStyle = '#f6f4ef';
				ctx!.fillStyle = '#0f1b2d';
				ctx!.lineWidth = 1.5;
				for (const dest of destinations) {
					const [x, y] = project(dest.entrance.lon, dest.entrance.lat);
					ctx!.beginPath();
					ctx!.moveTo(x, y - 5);
					ctx!.lineTo(x + 5, y);
					ctx!.lineTo(x, y + 5);
					ctx!.lineTo(x - 5, y);
					ctx!.closePath();
					ctx!.fill();
					ctx!.stroke();
				}
			}
			ctx!.globalAlpha = 1;
		}

		const end = DURATION + FADE + 600;
		function tick(now: number) {
			if (cancelled) return;
			started ||= now;
			elapsed = Math.min(end, now - started);
			draw(elapsed);
			if (elapsed < end) frame = requestAnimationFrame(tick);
		}

		const observer = new ResizeObserver(() => {
			layout();
			draw(elapsed);
		});
		observer.observe(host);

		const load = async () => {
			try {
				const r = await fetch('/bloom');
				const body = (await r.json()) as Bloom | { unavailable: true };
				if (cancelled || !r.ok || 'unavailable' in body || body.points.length === 0) return;
				bloom = body;
				layout();
				if (reduced) {
					elapsed = end;
					draw(end);
				} else {
					frame = requestAnimationFrame(tick);
				}
			} catch {
				// No bloom: the illustration stays on its own.
			}
		};
		const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback;
		if (idle) idle(load, { timeout: 800 });
		else setTimeout(load, 200);

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

<div class="bloom" bind:this={host}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
	{#if bloom && originAt}
		<span class="origin" style="left:{originAt.x}px;top:{originAt.y}px" aria-hidden="true">{bloom.origin.name}</span>
	{/if}
</div>

{#if bloom}
	<div class="caption">
		<div class="clock" aria-hidden="true">
			<span class="clock-label">{t.bloomClock}</span>
			<span class="clock-value">{departClock} → {liveClock}</span>
		</div>
		<p class="sentence">{caption} <span class="note">{t.bloomNote}</span></p>
		<ul class="legend" aria-label={t.bloomLegend}>
			{#each BANDS as _, i (i)}
				<li><span class="dot" style="--c:{COLORS[i]}"></span>{[t.reachBand0, t.reachBand1, t.reachBand2][i]}</li>
			{/each}
			{#if destinations.length}<li><span class="diamond"></span>{t.bloomDestinations}</li>{/if}
		</ul>
	</div>
{/if}

<style>
	.bloom {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
	.origin {
		position: absolute;
		transform: translate(-50%, calc(-100% - 10px));
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: rgb(15 27 45 / 0.7);
		border: 1px solid rgb(255 224 184 / 0.5);
		color: #ffe0b8;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		animation: pop 500ms var(--ease) both;
	}
	.caption {
		position: relative;
		z-index: 2;
		margin: 0;
		color: var(--snow);
		animation: fade 600ms 300ms var(--ease) both;
	}
	.clock {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.35rem;
	}
	.clock-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #c9d3de;
	}
	.clock-value {
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-variant-numeric: tabular-nums;
		color: #ffe0b8;
		line-height: 1.2;
	}
	.sentence {
		margin: 0;
		max-width: 26rem;
		color: #e6e9ee;
	}
	.note {
		color: #c9d3de;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.9rem;
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 0;
		color: #e6e9ee;
	}
	.dot {
		display: inline-block;
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 8px var(--c);
		margin-right: 0.35rem;
	}
	.diamond {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border: 1.5px solid var(--snow);
		transform: rotate(45deg);
		margin-right: 0.45rem;
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translate(-50%, calc(-100% - 2px)) scale(0.9);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
</style>

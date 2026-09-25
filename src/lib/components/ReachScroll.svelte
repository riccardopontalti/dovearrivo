<script lang="ts">
	// "How far you get in 90 minutes": real one-to-all arrivals from /bloom, scrubbed by the
	// scroll position. The section pins while the minutes run from 0 to 90 and the stops
	// appear in arrival order; the newest ones are marked in signal yellow. With reduced
	// motion the section does not pin and shows the final state. The counter is the text.
	import { onMount } from 'svelte';
	import type { Destination } from '$lib/api/types';
	import { fill, type Messages } from '$lib/i18n';

	interface Bloom {
		origin: { name: string; point: { lat: number; lon: number } };
		departAfter: string;
		minutes: number;
		points: number[];
	}

	let { t, locale, destinations }: { t: Messages; locale: 'it' | 'en'; destinations: Destination[] } = $props();

	let section = $state<HTMLElement>();
	let canvas = $state<HTMLCanvasElement>();
	let bloom = $state<Bloom | null>(null);
	let minutes = $state(0);
	let still = $state(false);

	const reached = $derived.by(() => {
		if (!bloom) return 0;
		let n = 0;
		for (let i = 2; i < bloom.points.length; i += 3) if (bloom.points[i] <= minutes) n++;
		return n;
	});
	const nf = $derived(new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-GB'));

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let frame = 0;
		let cancelled = false;
		let project: ((lon: number, lat: number) => [number, number]) | undefined;

		function layout() {
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
			// Leave room for the counter: on the left on wide screens, at the top on phones.
			const rect = wide
				? { x: box.width * 0.36, y: box.height * 0.1, w: box.width * 0.6, h: box.height * 0.82 }
				: { x: box.width * 0.06, y: box.height * 0.3, w: box.width * 0.88, h: box.height * 0.62 };
			const scale = Math.min(rect.w / Math.max(x1 - x0, 0.05), rect.h / Math.max(y1 - y0, 0.05));
			const ox = rect.x + (rect.w - (x1 - x0) * scale) / 2;
			const oy = rect.y + (rect.h - (y1 - y0) * scale) / 2;
			project = (lon, lat) => [ox + (lon * k - x0) * scale, oy + (-lat - y0) * scale];
		}

		function draw() {
			if (!canvas || !bloom || !project) return;
			const ctx = canvas.getContext('2d')!;
			const css = getComputedStyle(canvas);
			const ink = css.getPropertyValue('--ink').trim() || '#111';
			const signal = css.getPropertyValue('--signal').trim() || '#ffc700';
			const box = canvas.getBoundingClientRect();
			ctx.clearRect(0, 0, box.width, box.height);
			const p = bloom.points;
			const fresh = 6;
			// Older stops in ink, the newest in yellow with an ink edge.
			ctx.fillStyle = ink;
			for (let i = 0; i < p.length; i += 3) {
				if (p[i + 2] > minutes) break;
				if (p[i + 2] > minutes - fresh && minutes < bloom.minutes) continue;
				const [x, y] = project(p[i], p[i + 1]);
				ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
			}
			if (minutes < bloom.minutes) {
				ctx.fillStyle = signal;
				ctx.strokeStyle = ink;
				ctx.lineWidth = 1;
				for (let i = 0; i < p.length; i += 3) {
					if (p[i + 2] > minutes) break;
					if (p[i + 2] <= minutes - fresh) continue;
					const [x, y] = project(p[i], p[i + 1]);
					ctx.beginPath();
					ctx.arc(x, y, 3.5, 0, Math.PI * 2);
					ctx.fill();
					ctx.stroke();
				}
			}
			// Catalogue destinations: open squares.
			ctx.strokeStyle = ink;
			ctx.lineWidth = 1.5;
			for (const d of destinations) {
				const [x, y] = project(d.entrance.lon, d.entrance.lat);
				ctx.strokeRect(x - 4, y - 4, 8, 8);
			}
			// Origin.
			const [x, y] = project(bloom.origin.point.lon, bloom.origin.point.lat);
			ctx.fillStyle = signal;
			ctx.beginPath();
			ctx.arc(x, y, 7, 0, Math.PI * 2);
			ctx.fill();
			ctx.lineWidth = 2.5;
			ctx.stroke();
			ctx.fillStyle = ink;
			ctx.font = `700 13px ${css.getPropertyValue('--font-mono')}`;
			ctx.fillText(bloom.origin.name.toUpperCase(), x + 12, y - 10);
		}

		function update() {
			frame = 0;
			if (!section || !bloom) return;
			if (still) {
				minutes = bloom.minutes;
			} else {
				const r = section.getBoundingClientRect();
				const travel = r.height - innerHeight;
				const p = Math.min(1, Math.max(0, -r.top / Math.max(1, travel)));
				minutes = Math.round(p * bloom.minutes);
			}
			draw();
		}
		const schedule = () => (frame ||= requestAnimationFrame(update));

		const observer = new ResizeObserver(() => {
			layout();
			schedule();
		});
		// Redraw when the theme changes.
		const themeWatch = new MutationObserver(schedule);
		themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		fetch('/bloom')
			.then((r) => r.json())
			.then((body: Bloom | { unavailable: true }) => {
				if (cancelled || 'unavailable' in body || body.points.length === 0) return;
				bloom = body;
				requestAnimationFrame(() => {
					if (canvas) observer.observe(canvas);
					layout();
					update();
				});
			})
			.catch(() => {});
		addEventListener('scroll', schedule, { passive: true });
		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
			removeEventListener('scroll', schedule);
			observer.disconnect();
			themeWatch.disconnect();
		};
	});
</script>

{#if bloom}
	<section class="reach" class:still bind:this={section} aria-labelledby="reach-title">
		<div class="pin">
			<canvas bind:this={canvas} aria-hidden="true"></canvas>
			<div class="copy">
				<h2 id="reach-title">{t.reachTitleHome}</h2>
				<p class="hint">{t.reachScrollHint}</p>
				<p class="counter" aria-live="off">
					<span class="big">{fill(t.reachCounter, { m: minutes })}</span>
					<span class="stops">{fill(t.reachStops, { n: nf.format(reached) })}</span>
				</p>
				<p class="visually-hidden">
					{fill(bloom.departAfter.slice(0, 10) > new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date()) ? t.bloomTomorrow : t.bloomToday, { origin: bloom.origin.name, time: bloom.departAfter.slice(11, 16), n: nf.format(bloom.points.length / 3), minutes: bloom.minutes })}
				</p>
				<div class="meter" aria-hidden="true"><span style="transform:scaleX({minutes / bloom.minutes})"></span></div>
			</div>
		</div>
	</section>
{/if}

<style>
	.reach {
		position: relative;
		height: 280vh;
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
	}
	.still .pin {
		position: relative;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.copy {
		position: relative;
		z-index: 1;
		max-width: 26rem;
		padding: clamp(1.5rem, 5vw, 4rem) clamp(1rem, 3vw, 2.5rem);
	}
	h2 {
		margin: 0;
		font-size: clamp(2.2rem, 5vw, 4rem);
	}
	.hint {
		margin: 0.75rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.counter {
		display: flex;
		flex-direction: column;
		margin: 1.5rem 0 0.5rem;
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.big {
		font-size: clamp(2rem, 5vw, 3.6rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 1;
	}
	.stops {
		margin-top: 0.4rem;
		display: inline-block;
		align-self: flex-start;
		padding: 0.1rem 0.45rem;
		background: var(--signal);
		color: #111;
		font-weight: 600;
	}
	.meter {
		height: 3px;
		background: var(--hair);
		max-width: 16rem;
	}
	.meter span {
		display: block;
		height: 100%;
		background: var(--ink);
		transform-origin: left;
	}
	@media (max-width: 800px) {
		.copy {
			max-width: none;
		}
		.hint {
			display: none;
		}
		.counter {
			flex-direction: row;
			align-items: baseline;
			gap: 0.75rem;
			margin-top: 1rem;
		}
	}
</style>

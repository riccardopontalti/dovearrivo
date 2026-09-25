<script lang="ts">
	// A destination blade, as on Solari boards: one wide flap printed with a whole name. The
	// upper half carries the place, the lower half the spot. When the target changes the
	// blade turns through a few other destinations before it lands. Visual only.
	import { onDestroy, untrack } from 'svelte';

	interface Face {
		title: string;
		sub: string;
	}

	let { title, sub, pool = [], delay = 0, still = false }: { title: string; sub: string; pool?: Face[]; delay?: number; still?: boolean } = $props();

	const FLIP = 90;
	const blank: Face = { title: '', sub: '' };
	// svelte-ignore state_referenced_locally
	let shown = $state<Face>(still ? { title, sub } : blank);
	// svelte-ignore state_referenced_locally
	let prev = $state<Face>(still ? { title, sub } : blank);
	let n = $state(0);
	let timers: ReturnType<typeof setTimeout>[] = [];

	$effect(() => {
		const target = { title, sub };
		timers.forEach(clearTimeout);
		timers = [];
		if (still) {
			untrack(() => (prev = shown = target));
			return;
		}
		const others = pool.filter((f) => f.title !== target.title);
		const steps: Face[] = [];
		for (let i = 0; i < 2 + Math.floor(Math.random() * 3) && others.length; i++) steps.push(others[Math.floor(Math.random() * others.length)]);
		steps.push(target);
		steps.forEach((face, i) => {
			timers.push(
				setTimeout(() => {
					prev = shown;
					shown = face;
					n++;
				}, delay + i * FLIP * 2.2)
			);
		});
	});
	onDestroy(() => timers.forEach(clearTimeout));
</script>

<span class="blade" aria-hidden="true">
	<span class="half top"><span class="t">{shown.title}</span></span>
	<span class="half bottom"><span class="s">{prev.sub}</span></span>
	{#key n}
		{#if n > 0}
			<span class="half top flap falling"><span class="t">{prev.title}</span></span>
			<span class="half bottom flap landing"><span class="s">{shown.sub}</span></span>
		{/if}
	{/key}
</span>

<style>
	.blade {
		position: relative;
		display: block;
		flex: 1;
		min-width: 0;
		height: var(--blade-h, 3.2em);
		perspective: 600px;
		text-transform: uppercase;
	}
	.half {
		position: absolute;
		left: 0;
		right: 0;
		height: 50%;
		display: flex;
		overflow: hidden;
		padding: 0 0.45em;
		background: var(--flap);
		backface-visibility: hidden;
	}
	.top {
		top: 0;
		align-items: flex-end;
		border-radius: 4px 4px 0 0;
		background: linear-gradient(#242424, var(--flap));
	}
	.bottom {
		bottom: 0;
		align-items: flex-start;
		border-radius: 0 0 4px 4px;
	}
	.t,
	.s {
		display: block;
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.t {
		padding-bottom: 0.12em;
		font-size: calc(var(--blade-h, 48px) * 0.36);
		font-weight: 800;
		font-stretch: 72%;
		letter-spacing: 0.02em;
		line-height: 1.05;
		color: var(--flap-ink);
	}
	.s {
		padding-top: 0.45em;
		font-size: calc(var(--blade-h, 48px) * 0.21);
		font-weight: 600;
		font-stretch: 80%;
		letter-spacing: 0.08em;
		color: #bdb7aa;
	}
	/* The hinge. */
	.blade::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: calc(50% - 0.5px);
		height: 1px;
		background: rgb(0 0 0 / 0.9);
		z-index: 3;
	}
	.flap {
		z-index: 2;
	}
	.falling {
		transform-origin: 50% 100%;
		animation: fall 90ms ease-in forwards;
	}
	.landing {
		transform-origin: 50% 0;
		transform: rotateX(90deg);
		animation: land 90ms 90ms ease-out forwards;
	}
	@keyframes fall {
		to {
			transform: rotateX(-90deg);
			filter: brightness(0.55);
		}
	}
	@keyframes land {
		from {
			transform: rotateX(90deg);
			filter: brightness(1.6);
		}
		to {
			transform: rotateX(0deg);
		}
	}
</style>

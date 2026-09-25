<script lang="ts">
	// One split-flap card. When `char` changes the flap spins through the preceding cards:
	// the upper half of the old card falls, the lower half of the new one lands. With
	// `still` (reduced motion, server render) it shows the target at once.
	import { onDestroy, untrack } from 'svelte';
	import { flapSequence } from '$lib/flap';

	let { char, delay = 0, still = false }: { char: string; delay?: number; still?: boolean } = $props();

	const FLIP = 70;
	// svelte-ignore state_referenced_locally
	let shown = $state(still ? char : ' ');
	// svelte-ignore state_referenced_locally
	let prev = $state(still ? char : ' ');
	let n = $state(0);
	let timers: ReturnType<typeof setTimeout>[] = [];

	$effect(() => {
		const target = char;
		timers.forEach(clearTimeout);
		timers = [];
		if (still) {
			untrack(() => (prev = shown = target));
			return;
		}
		const steps = flapSequence(untrack(() => shown), target, 3 + Math.floor(Math.random() * 5));
		steps.forEach((c, i) => {
			timers.push(
				setTimeout(() => {
					prev = shown;
					shown = c;
					n++;
				}, delay + i * FLIP * 1.6)
			);
		});
	});
	onDestroy(() => timers.forEach(clearTimeout));
</script>

<span class="cell" aria-hidden="true">
	<span class="half top"><span>{shown}</span></span>
	<span class="half bottom"><span>{prev}</span></span>
	{#key n}
		{#if n > 0}
			<span class="half top flap falling"><span>{prev}</span></span>
			<span class="half bottom flap landing"><span>{shown}</span></span>
		{/if}
	{/key}
</span>

<style>
	.cell {
		position: relative;
		display: inline-block;
		width: var(--cell-w, 1.4em);
		height: var(--cell-h, 2em);
		perspective: 400px;
		text-align: center;
		vertical-align: top;
		white-space: pre;
	}
	.half {
		position: absolute;
		left: 0;
		right: 0;
		height: 50%;
		overflow: hidden;
		background: var(--flap);
		backface-visibility: hidden;
	}
	.half > span {
		display: block;
		height: var(--cell-h, 2em);
		line-height: var(--cell-h, 2em);
	}
	.top {
		top: 0;
		border-radius: 3px 3px 0 0;
		background: linear-gradient(#232323, var(--flap));
	}
	.bottom {
		bottom: 0;
		border-radius: 0 0 3px 3px;
	}
	.bottom > span {
		transform: translateY(-50%);
	}
	/* The hinge. */
	.cell::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: calc(50% - 0.5px);
		height: 1px;
		background: rgb(0 0 0 / 0.85);
		z-index: 3;
	}
	.flap {
		z-index: 2;
	}
	.falling {
		transform-origin: 50% 100%;
		animation: fall 70ms ease-in forwards;
	}
	.landing {
		transform-origin: 50% 0;
		transform: rotateX(90deg);
		animation: land 70ms 70ms ease-out forwards;
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

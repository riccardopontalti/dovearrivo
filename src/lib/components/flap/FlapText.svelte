<script lang="ts">
	// A word on split flaps. Visual only: callers provide the text for assistive technology.
	import { toFlaps } from '$lib/flap';
	import FlapCell from './FlapCell.svelte';

	let {
		text,
		length,
		align = 'left',
		delay = 0,
		stagger = 35,
		still = false
	}: { text: string; length: number; align?: 'left' | 'right'; delay?: number; stagger?: number; still?: boolean } = $props();

	const chars = $derived(toFlaps(text, length, align));
</script>

<span class="flaps" aria-hidden="true">
	{#each chars as c, i (i)}<FlapCell char={c} delay={delay + i * stagger} {still} />{/each}
</span>

<style>
	.flaps {
		display: inline-flex;
		gap: var(--cell-gap, 2px);
	}
</style>

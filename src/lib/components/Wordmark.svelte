<script lang="ts">
	// Wordmark: heavy slanted grotesque, like railway brands; "Arrivo" on a signal-yellow
	// band, the place you get to. Plain text, so it reads, copies and scales like text.
	let { text = 'DoveArrivo' }: { text?: string } = $props();
	const first = $derived(text.startsWith('Dove') ? 'Dove' : text);
	const second = $derived(text.startsWith('Dove') ? text.slice(4) : '');
</script>

<span class="wordmark"><span class="first">{first}</span>{#if second}<span class="second">{second}</span>{/if}</span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		font-weight: 900;
		font-stretch: 88%;
		letter-spacing: -0.035em;
		line-height: 1;
		white-space: nowrap;
		/* A slant drawn from the upright font: no extra italic file to download. */
		transform: skewX(-9deg);
	}
	.second {
		margin-left: 0.1em;
		padding: 0.02em 0.14em 0.06em;
		background: var(--signal);
		color: #111;
	}
</style>

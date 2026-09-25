<script lang="ts">
	// Wordmark: "Dove" light, "Arrivo" heavy, and the last "o" drawn as a stop on a line map,
	// the place you arrive at. The letter stays in the text for copy and assistive technology.
	let { text = 'DoveArrivo' }: { text?: string } = $props();
	const light = $derived(text.startsWith('Dove') ? 'Dove' : '');
	const heavy = $derived(text.slice(light.length, -1));
	const last = $derived(text.slice(-1));
</script>

<span class="wordmark"><span class="light">{light}</span><span class="heavy">{heavy}<span class="stop">{last}</span></span></span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		letter-spacing: -0.03em;
		line-height: 1;
		white-space: nowrap;
	}
	.light {
		font-weight: 350;
		font-stretch: 88%;
	}
	.heavy {
		font-weight: 850;
		font-stretch: 78%;
	}
	.stop {
		position: relative;
		display: inline-block;
		color: transparent;
		margin-left: 0.04em;
	}
	/* The stop: a signal-yellow ring the size of the "o". */
	.stop::before {
		content: '';
		position: absolute;
		left: 50%;
		/* Sits on the baseline, as tall as the lowercase letters. */
		bottom: 0.2em;
		width: 0.5em;
		height: 0.5em;
		transform: translateX(-50%);
		border: 0.1em solid var(--ink);
		border-radius: 50%;
		background: var(--signal);
		box-sizing: border-box;
	}
	@media (forced-colors: active) {
		.stop {
			color: CanvasText;
		}
		.stop::before {
			display: none;
		}
	}
</style>

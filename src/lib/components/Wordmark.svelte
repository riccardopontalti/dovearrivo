<script lang="ts">
	// Wordmark: heavy condensed grotesque, "Dove" in ink and "Arrivo" underlined by the way
	// there, both cut at mid-height by the hinge of a split-flap card. Real text: it reads and
	// scales like text.
	let { text = 'DoveArrivo' }: { text?: string } = $props();
	const split = $derived(text.startsWith('Dove') ? ['Dove', text.slice(4)] : [text, '']);
</script>

<span class="wordmark"><span class="a">{split[0]}</span><span class="b">{split[1]}</span></span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		font-weight: 900;
		font-stretch: 70%;
		letter-spacing: -0.035em;
		line-height: 1;
	}
	.a,
	.b {
		/* The hinge: a thin gap across the letters at mid x-height. */
		background: linear-gradient(var(--ink) 0 47%, transparent 47% 52%, var(--ink) 52%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.b {
		position: relative;
		margin-left: 0.04em;
	}
	/* The way there: a short signal-yellow bar under "Arrivo", with its arrow head. */
	.b::after {
		content: '';
		position: absolute;
		left: 0.04em;
		right: 0.1em;
		bottom: -0.1em;
		height: 0.14em;
		background: var(--signal);
		clip-path: polygon(0 0, calc(100% - 0.2em) 0, 100% 50%, calc(100% - 0.2em) 100%, 0 100%);
	}
	@media (forced-colors: active) {
		.a,
		.b {
			color: CanvasText;
			background: none;
		}
	}
</style>

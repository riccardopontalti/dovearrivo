<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--bg: #fbfaf7;
		--surface: #ffffff;
		--text: #1d1f1e;
		--muted: #5b615e;
		--accent: #0f6e5a;
		--border: #dcdfdc;
		--notice: #fff4d6;
		color-scheme: light dark;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root) {
			--bg: #121413;
			--surface: #1b1e1d;
			--text: #eceeed;
			--muted: #a6ada9;
			--accent: #5cc8ad;
			--border: #2f3432;
			--notice: #3a3218;
		}
	}
	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
		line-height: 1.5;
	}
	:global(a) {
		color: var(--accent);
	}
	:global(:focus-visible) {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}
</style>

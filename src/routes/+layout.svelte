<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { messages } from '$lib/i18n';

	let { children, data } = $props();

	// The server sets <html lang>; keep it right after client-side language switches.
	$effect(() => {
		if (typeof page.data.locale === 'string') document.documentElement.lang = page.data.locale;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.preview}
	<p class="preview-banner" role="note">{messages(data.layoutLocale).previewBanner}</p>
{/if}
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
		--alert: #fde2dd;
		--accent-soft: #e0f1ec;
		--on-accent: #ffffff;
		/* Reachability bands: see src/lib/reach-bands.ts (validated ordinal ramps). */
		--band-0: #86b6ef;
		--band-1: #3987e5;
		--band-2: #256abf;
		--band-3: #184f95;
		--band-4: #0d366b;
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
			--alert: #4a2320;
			--accent-soft: #173a32;
			--on-accent: #06221b;
			--band-0: #184f95;
			--band-1: #2a78d6;
			--band-2: #5598e7;
			--band-3: #86b6ef;
			--band-4: #b7d3f6;
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
	:global(label) {
		display: block;
		font-weight: 600;
		margin-bottom: 0.3rem;
	}
	:global(input:not([type='hidden']), select) {
		width: 100%;
		box-sizing: border-box;
		min-height: 44px;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
	}
	:global(.help) {
		margin: 0.3rem 0 0;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.preview-banner {
		margin: 0;
		padding: 0.4rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		background: var(--notice);
		color: var(--text);
	}
	:global(:focus-visible) {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}
</style>

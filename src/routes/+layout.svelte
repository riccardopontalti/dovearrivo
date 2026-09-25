<script lang="ts">
	import '@fontsource-variable/fraunces/wght.css';
	import '@fontsource-variable/inter/wght.css';
	import frauncesLatin from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
	import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { messages } from '$lib/i18n';

	let { children, data } = $props();

	// The server sets <html lang>; keep it right after client-side language switches.
	$effect(() => {
		if (typeof page.data.locale === 'string') document.documentElement.lang = page.data.locale;
	});

	// Cross-fade between pages where the browser supports view transitions.
	onNavigate((navigation) => {
		const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
		if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		if (navigation.from?.url.pathname === navigation.to?.url.pathname && navigation.from?.url.search === navigation.to?.url.search) return;
		return new Promise((resolve) => {
			doc.startViewTransition!(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" as="font" type="font/woff2" href={frauncesLatin} crossorigin="anonymous" />
	<link rel="preload" as="font" type="font/woff2" href={interLatin} crossorigin="anonymous" />
	<meta name="theme-color" content="#0f1b2d" />
</svelte:head>

{#if data.preview}
	<p class="preview-banner" role="note">{messages(data.layoutLocale).previewBanner}</p>
{/if}
{@render children()}

<style>
	/* Alpenglow palette (docs/DESIGN-BRIEF.md). Text pairs meet WCAG 2.2 AA; checked ratios
	   are noted where they are close to the limit. */
	:global(:root) {
		--night: #0f1b2d;
		--snow: #f6f4ef;
		--granite: #5a6472;
		--teal: #2bb3a3;
		--apricot: #ff9a62;

		--bg: var(--snow);
		--surface: #ffffff;
		--surface-2: #efebe3;
		--text: var(--night);
		--muted: var(--granite); /* 5.5:1 on snow */
		--accent: #0b6e63; /* teal for text and links, 5.6:1 on snow */
		--border: #dcd7cc;
		--notice: #fff1d6;
		--alert: #fde2dd;
		--accent-soft: #dff2ee;
		--glow: var(--apricot);
		--on-glow: var(--night); /* 8.3:1 */
		--on-accent: #ffffff;
		--out: #0b6e63;
		--back: #b24a17; /* 5.4:1 on white */
		--stay: #d9dee5;
		--focus: #0b6e63;
		--shadow: 0 1px 2px rgb(15 27 45 / 0.06), 0 8px 24px rgb(15 27 45 / 0.08);

		--font-display: 'Fraunces Variable', 'Iowan Old Style', Georgia, serif;
		--font-text: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
		--ease: cubic-bezier(0.2, 0.7, 0.2, 1);
		--radius: 16px;

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
			--bg: #0b1523;
			--surface: #13223a;
			--surface-2: #1a2c47;
			--text: var(--snow);
			--muted: #a7b1bf; /* 7.2:1 on surface */
			--accent: var(--teal); /* 6.0:1 on surface */
			--border: #26395a;
			--notice: #3a3218;
			--alert: #4a2320;
			--accent-soft: #123a3c;
			--on-accent: var(--night);
			--out: var(--teal);
			--back: var(--apricot);
			--stay: #2c4263;
			--focus: var(--apricot);
			--shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 10px 30px rgb(0 0 0 / 0.35);
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
		font-family: var(--font-text);
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		text-rendering: optimizeLegibility;
	}
	:global(h1, h2, h3) {
		font-family: var(--font-display);
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.15;
	}
	:global(a) {
		color: var(--accent);
		text-underline-offset: 0.18em;
	}
	:global(label) {
		display: block;
		font-weight: 600;
		font-size: 0.92rem;
		margin-bottom: 0.3rem;
	}
	:global(input:not([type='hidden']), select) {
		width: 100%;
		box-sizing: border-box;
		min-height: 44px;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
		transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
	}
	:global(input:not([type='hidden']):hover, select:hover) {
		border-color: var(--muted);
	}
	:global(.help) {
		margin: 0.3rem 0 0;
		color: var(--muted);
		font-size: 0.85rem;
	}
	:global(:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	:global(.visually-hidden) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.preview-banner {
		margin: 0;
		padding: 0.4rem 1rem;
		text-align: center;
		font-size: 0.85rem;
		background: var(--notice);
		color: var(--text);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(*, *::before, *::after) {
			animation-duration: 1ms !important;
			animation-delay: 0ms !important;
			transition-duration: 1ms !important;
			scroll-behavior: auto !important;
		}
	}
</style>

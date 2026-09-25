<script lang="ts">
	import '@fontsource-variable/archivo/wdth.css';
	import '@fontsource-variable/jetbrains-mono/wght.css';
	import archivoLatin from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url';
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
		if (navigation.from?.url.href === navigation.to?.url.href) return;
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
	<link rel="preload" as="font" type="font/woff2" href={archivoLatin} crossorigin="anonymous" />
</svelte:head>

{#if data.preview}
	<p class="preview-banner" role="note">{messages(data.layoutLocale).previewBanner}</p>
{/if}
{@render children()}

<style>
	/* "Tabellone" palette: paper, ink and one signal yellow (DESIGN-BRIEF.md). Yellow is used
	   only as a background under ink or outlined in ink: on paper it has no contrast. */
	:global(:root) {
		--paper: #ede9df;
		--surface: #f7f5ef;
		--surface-2: #e3ded2;
		--ink: #111111;
		--muted: #56544e; /* 6.2:1 on paper */
		--rule: #111111;
		--hair: rgb(17 17 17 / 0.14);
		--signal: #ffc700;
		--on-signal: #111111; /* 12:1 */
		--board: #0e0e0e;
		--flap: #1c1c1c;
		--flap-ink: #f3efe4;
		--notice: #f6e7a8;
		--alert: #f3cfc4;
		--out: var(--ink);
		--back: var(--signal);
		--back-edge: var(--ink);
		--focus: #111111;

		/* Aliases kept for the other pages. */
		--bg: var(--paper);
		--text: var(--ink);
		--accent: var(--ink);
		--border: var(--hair);
		--accent-soft: rgb(255 199 0 / 0.35);
		--glow: var(--signal);
		--on-glow: var(--on-signal);
		--on-accent: var(--paper);

		--font-sans: 'Archivo Variable', 'Helvetica Neue', Arial, sans-serif;
		--font-mono: 'JetBrains Mono Variable', ui-monospace, 'SFMono-Regular', Menlo, monospace;
		--font-display: var(--font-sans);
		--font-text: var(--font-sans);
		--ease: cubic-bezier(0.2, 0.8, 0.1, 1);
		--ease-in-out: cubic-bezier(0.7, 0, 0.2, 1);
		--radius: 4px;
		--shadow: none;

		/* Reachability bands: see src/lib/reach-bands.ts (validated ordinal ramps). */
		--band-0: #86b6ef;
		--band-1: #3987e5;
		--band-2: #256abf;
		--band-3: #184f95;
		--band-4: #0d366b;
		color-scheme: light;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) {
			--paper: #111110;
			--surface: #1b1b19;
			--surface-2: #262623;
			--ink: #ede9df;
			--muted: #a9a59b;
			--rule: #ede9df;
			--hair: rgb(237 233 223 / 0.16);
			--notice: #3b3417;
			--alert: #4a2320;
			--out: var(--ink);
			--back-edge: #111110;
			--focus: var(--signal);
			--accent-soft: rgb(255 199 0 / 0.2);
			--band-0: #184f95;
			--band-1: #2a78d6;
			--band-2: #5598e7;
			--band-3: #86b6ef;
			--band-4: #b7d3f6;
			color-scheme: dark;
		}
	}
	:global(:root[data-theme='dark']) {
		--paper: #111110;
		--surface: #1b1b19;
		--surface-2: #262623;
		--ink: #ede9df;
		--muted: #a9a59b;
		--rule: #ede9df;
		--hair: rgb(237 233 223 / 0.16);
		--notice: #3b3417;
		--alert: #4a2320;
		--out: var(--ink);
		--back-edge: #111110;
		--focus: var(--signal);
		--accent-soft: rgb(255 199 0 / 0.2);
		--band-0: #184f95;
		--band-1: #2a78d6;
		--band-2: #5598e7;
		--band-3: #86b6ef;
		--band-4: #b7d3f6;
		color-scheme: dark;
	}
	:global(body) {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: 1.0625rem;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		transition: background-color 300ms var(--ease);
	}
	:global(h1, h2, h3) {
		font-weight: 800;
		font-stretch: 85%;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	:global(a) {
		color: inherit;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.2em;
	}
	:global(a:hover) {
		text-decoration-thickness: 2px;
	}
	:global(label) {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-bottom: 0.35rem;
	}
	:global(input:not([type='hidden']), select) {
		width: 100%;
		box-sizing: border-box;
		min-height: 48px;
		padding: 0.55rem 0.75rem;
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		transition:
			box-shadow 150ms var(--ease),
			background-color 150ms var(--ease);
	}
	:global(input:not([type='hidden']):focus, select:focus) {
		box-shadow: 4px 4px 0 var(--signal);
	}
	:global(.help) {
		margin: 0.35rem 0 0;
		color: var(--muted);
		font-size: 0.85rem;
	}
	:global(:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	:global(::selection) {
		background: var(--signal);
		color: #111;
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
		padding: 0.35rem 1rem;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		background: var(--signal);
		color: #111;
	}
	/* Theme switch: the new theme grows from the button (see ThemeToggle.svelte). */
	:global(html.theme-switch::view-transition-old(root), html.theme-switch::view-transition-new(root)) {
		animation: none;
		mix-blend-mode: normal;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(*, *::before, *::after) {
			animation-duration: 1ms !important;
			animation-delay: 0ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 1ms !important;
			scroll-behavior: auto !important;
		}
	}
</style>

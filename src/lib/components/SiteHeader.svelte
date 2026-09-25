<script lang="ts">
	// Shared header: brand, secondary pages and language switch. `overlay` sits on the dark
	// hero with light text; otherwise it follows the page colours.
	import type { Messages } from '$lib/i18n';
	import Logo from './Logo.svelte';

	let {
		t,
		locale,
		otherLocaleHref,
		overlay = false,
		current
	}: { t: Messages; locale: 'it' | 'en'; otherLocaleHref: string; overlay?: boolean; current?: 'reach' | 'data' } = $props();
	const otherLocale = $derived(locale === 'it' ? 'en' : 'it');
</script>

<a class="skip" href="#content">{t.skipLink}</a>
<header class="top" class:overlay>
	<a class="brand" href="/?lang={locale}">
		<Logo />
		<span>{t.appName}</span>
	</a>
	<nav aria-label={t.navLabel}>
		<a class="secondary" href="/reachability?lang={locale}" aria-current={current === 'reach' ? 'page' : undefined}>{t.navReach}</a>
		<a class="secondary" href="/data-status?lang={locale}" aria-current={current === 'data' ? 'page' : undefined}>{t.navData}</a>
		<a class="lang" href={otherLocaleHref} hreflang={otherLocale}>{t.otherLanguage}</a>
	</nav>
</header>

<style>
	.skip {
		position: absolute;
		left: 1rem;
		top: -3rem;
		z-index: 50;
		padding: 0.6rem 1rem;
		border-radius: 10px;
		background: var(--glow);
		color: var(--on-glow);
		font-weight: 600;
	}
	.skip:focus {
		top: 0.5rem;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		min-height: 3.75rem;
		padding: 0 clamp(1rem, 3vw, 2rem);
		position: relative;
		z-index: 5;
	}
	.overlay {
		color: var(--snow);
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-height: 44px;
		font-family: var(--font-display);
		font-weight: 650;
		font-size: 1.25rem;
		letter-spacing: -0.01em;
		text-decoration: none;
		color: inherit;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.7rem;
		border-radius: 999px;
		color: inherit;
		text-decoration: none;
		font-size: 0.92rem;
		font-weight: 500;
		transition: background-color 150ms var(--ease);
	}
	nav a:hover,
	nav a[aria-current='page'] {
		background: color-mix(in srgb, currentColor 10%, transparent);
	}
	.lang {
		border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
	}
	@media (max-width: 719px) {
		.secondary {
			display: none;
		}
	}
</style>

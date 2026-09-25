<script lang="ts">
	// Shared header: brand, secondary pages, theme and language.
	import type { Messages } from '$lib/i18n';
	import Logo from './Logo.svelte';
	import Wordmark from './Wordmark.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		t,
		locale,
		otherLocaleHref,
		current
	}: { t: Messages; locale: 'it' | 'en'; otherLocaleHref: string; current?: 'reach' | 'data' } = $props();
	const otherLocale = $derived(locale === 'it' ? 'en' : 'it');
</script>

<a class="skip" href="#content">{t.skipLink}</a>
<header class="top">
	<a class="brand" href="/?lang={locale}">
		<Logo />
		<Wordmark text={t.appName} />
	</a>
	<nav aria-label={t.navLabel}>
		<a class="secondary" href="/reachability?lang={locale}" aria-current={current === 'reach' ? 'page' : undefined}>{t.navReach}</a>
		<a class="secondary" href="/data-status?lang={locale}" aria-current={current === 'data' ? 'page' : undefined}>{t.navData}</a>
		<ThemeToggle {t} />
		<a class="lang" href={otherLocaleHref} hreflang={otherLocale} aria-label={t.otherLanguage}>{otherLocale.toUpperCase()}</a>
	</nav>
</header>

<style>
	.skip {
		position: absolute;
		left: 1rem;
		top: -4rem;
		z-index: 50;
		padding: 0.6rem 1rem;
		background: var(--signal);
		color: #111;
		font-weight: 700;
	}
	.skip:focus {
		top: 0.5rem;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		min-height: 4rem;
		padding: 0 clamp(1rem, 3vw, 2.5rem);
		border-bottom: 1.5px solid var(--rule);
		position: relative;
		z-index: 5;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 44px;
		font-size: 1.7rem;
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.6rem;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
	}
	.secondary {
		background-image: linear-gradient(var(--signal), var(--signal));
		background-size: 0 45%;
		background-position: 0 60%;
		background-repeat: no-repeat;
		transition: background-size 250ms var(--ease);
	}
	.secondary:hover,
	.secondary[aria-current='page'] {
		background-size: 100% 45%;
	}
	.lang {
		justify-content: center;
		width: 44px;
		padding: 0;
		border: 1.5px solid currentColor;
		border-radius: 50%;
	}
	.lang:hover {
		background: var(--ink);
		color: var(--paper);
	}
	@media (max-width: 719px) {
		.secondary {
			display: none;
		}
	}
</style>

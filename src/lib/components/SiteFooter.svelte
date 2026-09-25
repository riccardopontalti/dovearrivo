<script lang="ts">
	import type { Messages } from '$lib/i18n';

	let { t, locale }: { t: Messages; locale: 'it' | 'en' } = $props();
</script>

<footer class="bottom">
	<a href="/data-status?lang={locale}">{t.dataStatusLink}</a>
	<a href="/reachability?lang={locale}">{t.navReach}</a>
	<a href="https://github.com/riccardopontalti/dovearrivo">{t.sourceCode}</a>
</footer>

<style>
	.bottom {
		display: flex;
		gap: 0.25rem 1.5rem;
		flex-wrap: wrap;
		border-top: 1px solid var(--border);
		padding: 0.75rem 0 2rem;
		font-size: 0.92rem;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
</style>

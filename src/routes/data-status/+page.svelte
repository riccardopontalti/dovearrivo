<script lang="ts">
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { messages } from '$lib/i18n';

	let { data } = $props();
	const t = $derived(messages(data.locale));
	const otherLocaleHref = $derived(`/data-status?lang=${data.locale === 'it' ? 'en' : 'it'}`);
	const status = $derived(data.status);
	const statusLabel = $derived(
		status.status === 'current' ? t.statusCurrent : status.status === 'warning' ? t.statusWarning : t.statusUnavailable
	);
</script>

<svelte:head>
	<title>{t.dataStatusTitle} · {t.appName}</title>
</svelte:head>

<SiteHeader {t} locale={data.locale} {otherLocaleHref} current="data" />
<main class="page" id="content">
	<p><a href="/?lang={data.locale}">← {t.backToSearch}</a></p>
	<h1>{t.dataStatusTitle}</h1>
	<dl>
		<dt>{t.dataStatusTitle}</dt>
		<dd>{statusLabel}</dd>
		<dt>{t.dataVersion}</dt>
		<dd>{status.dataVersion ?? '—'}</dd>
		<dt>{t.coverage}</dt>
		<dd>{status.availableFrom ?? '—'} → {status.availableTo ?? '—'}</dd>
	</dl>
	<h2>{t.sources}</h2>
	<ul>
		{#each status.sources as source (source.id)}
			<li>
				<a href={source.sourceUrl}>{source.publisher}</a>
				{#if source.feedVersion}· {source.feedVersion}{/if}
				· <a href={source.licenseUrl}>{t.licence}</a>
				{#if source.checkedAt}· {t.lastCheck} {source.checkedAt.slice(0, 16).replace('T', ' ')} UTC{/if}
			</li>
		{/each}
	</ul>
	<ul>
		{#each status.limitations as limitation (limitation)}
			<li>{limitation}</li>
		{/each}
	</ul>
	<p class="muted">{t.scheduledNotice}</p>
</main>

<style>
	.page {
		max-width: 44rem;
		margin: 0 auto;
		padding: 0.5rem 1rem 3rem;
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.25rem 1rem;
	}
	dt,
	.muted {
		color: var(--muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	li {
		overflow-wrap: anywhere;
		margin-bottom: 0.25rem;
	}
</style>

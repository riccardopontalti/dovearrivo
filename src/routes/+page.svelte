<script lang="ts">
	let { data } = $props();
	const t = $derived(data.t);
	const status = $derived(data.dataStatus);
	const otherLocale = $derived(data.locale === 'it' ? 'en' : 'it');
</script>

<svelte:head>
	<title>{t.appName}</title>
	<meta name="description" content={t.tagline} />
</svelte:head>

<main>
	<nav aria-label="Language">
		<a href="?lang={otherLocale}" hreflang={otherLocale}>{t.otherLanguage}</a>
	</nav>

	<h1>{t.appName}</h1>
	<p class="tagline">{t.tagline}</p>

	<p class="notice" role="status">{t.devNotice}</p>

	<section aria-labelledby="data-status">
		<h2 id="data-status">{t.dataStatusTitle}</h2>
		<dl>
			<dt>{t.dataVersion}</dt>
			<dd>{status.dataVersion ?? '—'}</dd>
			<dt>{t.coverage}</dt>
			<dd>{status.availableFrom ?? '—'} → {status.availableTo ?? '—'}</dd>
			<dt>{t.sources}</dt>
			<dd>
				{#each status.sources as source (source.id)}
					<a href={source.sourceUrl}>{source.publisher}</a>
				{/each}
			</dd>
		</dl>
		<ul>
			{#each status.limitations as limitation (limitation)}
				<li>{limitation}</li>
			{/each}
		</ul>
	</section>

	<footer>
		<p>{t.scheduledNotice}</p>
		<a href="https://github.com/riccardopontalti/dovearrivo">{t.sourceCode}</a>
	</footer>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}
	nav {
		text-align: right;
	}
	nav a {
		display: inline-block;
		min-height: 44px;
		line-height: 44px;
	}
	h1 {
		margin: 0.5rem 0 0;
		font-size: 2.25rem;
	}
	.tagline {
		margin-top: 0.25rem;
		color: var(--muted);
		font-size: 1.15rem;
	}
	.notice {
		background: var(--notice);
		border-radius: 8px;
		padding: 0.75rem 1rem;
	}
	section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0 1rem 0.5rem;
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.25rem 1rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	footer {
		margin-top: 2rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>

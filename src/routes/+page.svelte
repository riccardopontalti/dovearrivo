<script lang="ts">
	import { navigating, page } from '$app/state';
	import ProposalCard from '$lib/components/ProposalCard.svelte';
	import PlacePicker from '$lib/components/PlacePicker.svelte';
	import { longDate, placeLabel } from '$lib/format';
	import { fill, messages, type Messages } from '$lib/i18n';
	import { coordinateFrom, OPTIONS, toParams } from '$lib/search-form';

	let { data } = $props();
	const t = $derived(messages(data.locale));
	const otherLocale = $derived(data.locale === 'it' ? 'en' : 'it');
	// Switching language keeps the current search.
	const otherLocaleHref = $derived.by(() => {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('lang', otherLocale);
		return `/?${params}`;
	});
	const outcome = $derived(data.outcome);
	const busy = $derived(navigating.to?.url.pathname === '/');

	let from = $state('');
	let query = $state('');
	$effect.pre(() => {
		from = data.form.from;
		query = data.form.fromQuery;
	});

	const minutes = (n: number) => (n < 60 ? `${n} min` : n % 60 === 0 ? `${n / 60} h` : `${Math.floor(n / 60)} h ${n % 60}`);

	function errorText(key: string): string {
		const template = (t as Record<string, string>)[key] ?? t.errInvalid;
		return fill(template, { from: data.status.availableFrom ?? '—', to: data.status.availableTo ?? '—' });
	}

	function chooseHref(stopId: string, name: string): string {
		return `/?${toParams({ ...data.form, from: stopId, fromQuery: name }, data.locale)}`;
	}

	const found = (n: number, tt: Messages) => (n === 1 ? tt.foundOne : fill(tt.foundMany, { n }));
</script>

<svelte:head>
	<title>{t.appName} · {t.tagline}</title>
	<meta name="description" content={t.tagline} />
</svelte:head>

<div class="shell">
	<header class="top">
		<a class="brand" href="/?lang={data.locale}">{t.appName}</a>
		<nav aria-label="Language"><a href={otherLocaleHref} hreflang={otherLocale}>{t.otherLanguage}</a></nav>
	</header>

	<main class="layout">
		<section class="search" aria-labelledby="search-title">
			<h1 id="search-title">{t.formTitle}</h1>
			<p class="tagline">{t.tagline}</p>

			<form method="GET" action="/">
				<input type="hidden" name="lang" value={data.locale} />
				<PlacePicker {t} bind:from bind:query />

				<div class="row">
					<div class="field grow">
						<label for="date">{t.date}</label>
						<input
							id="date"
							name="date"
							type="date"
							required
							value={data.form.date}
							min={data.status.availableFrom ?? undefined}
							max={data.status.availableTo ?? undefined}
						/>
					</div>
				</div>
				<div class="row">
					<div class="field">
						<label for="start">{t.start}</label>
						<input id="start" name="start" type="time" step="900" required value={data.form.start} />
					</div>
					<div class="field">
						<label for="end">{t.end}</label>
						<input id="end" name="end" type="time" step="900" required value={data.form.end} />
					</div>
				</div>

				<fieldset>
					<legend>{t.filters}</legend>
					<div class="grid">
						<div class="field">
							<label for="maxJourneyMinutes">{t.maxJourney}</label>
							<select id="maxJourneyMinutes" name="maxJourneyMinutes" value={data.form.maxJourneyMinutes}>
								{#each OPTIONS.maxJourneyMinutes as o (o)}<option value={o}>{minutes(o)}</option>{/each}
							</select>
						</div>
						<div class="field">
							<label for="minStayMinutes">{t.minStay}</label>
							<select id="minStayMinutes" name="minStayMinutes" value={data.form.minStayMinutes}>
								{#each OPTIONS.minStayMinutes as o (o)}<option value={o}>{minutes(o)}</option>{/each}
							</select>
						</div>
						<div class="field">
							<label for="maxWalkMinutes">{t.maxWalk}</label>
							<select id="maxWalkMinutes" name="maxWalkMinutes" value={data.form.maxWalkMinutes} aria-describedby="walkHelp">
								{#each OPTIONS.maxWalkMinutes as o (o)}<option value={o}>{minutes(o)}</option>{/each}
							</select>
							<p id="walkHelp" class="help">{t.maxWalkHelp}</p>
						</div>
						<div class="field">
							<label for="maxTransfers">{t.maxTransfers}</label>
							<select id="maxTransfers" name="maxTransfers" value={data.form.maxTransfers}>
								{#each OPTIONS.maxTransfers as o (o)}<option value={o}>{o}</option>{/each}
							</select>
						</div>
					</div>
				</fieldset>

				<button type="submit" disabled={busy}>{busy ? t.searching : t.submit}</button>
			</form>
		</section>

		<section class="results" aria-live="polite" aria-busy={busy}>
			{#if data.mock}<p class="notice">{t.mockNotice}</p>{/if}

			{#if outcome?.kind === 'error'}
				<p class="alert" role="alert">{errorText(outcome.error)}</p>
			{:else if outcome?.kind === 'chooseStop'}
				<h2>{t.chooseStop}</h2>
				{#if outcome.places.length === 0}
					<p>{fill(t.chooseStopNone, { q: data.form.fromQuery })}</p>
				{:else}
					<ul class="choices">
						{#each outcome.places as place (`${place.kind}:${place.stopId ?? coordinateFrom(place.point)}`)}
							<li>
								<a href={chooseHref(place.stopId ?? coordinateFrom(place.point), place.name)}>{place.name}</a>
								<span class="muted">{place.area && place.kind !== 'stop' ? `${place.area} · ` : ''}{placeLabel(place, t)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			{:else if outcome?.kind === 'results'}
				{@const r = outcome.response}
				<h2>{t.resultsTitle}</h2>
				<p class="summary">
					{data.form.fromQuery} · {longDate(data.form.date, data.locale)} · {data.form.start}–{data.form.end}
				</p>
				{#if r.status === 'partial'}
					<p class="alert" role="alert"><strong>{t.partialSearch}.</strong> {t.partialHelp}</p>
				{/if}
				{#if r.warnings.includes('DATA_CHECK_OVERDUE')}<p class="notice">{t.checkOverdue}</p>{/if}
				{#if r.proposals.length === 0}
					<div class="empty">
						<p><strong>{t.noProposals}</strong></p>
						<p class="muted">{t.noProposalsHelp}</p>
					</div>
				{:else}
					<p class="muted">{found(r.proposals.length, t)}. {t.rankingHelp}</p>
					<ol class="cards">
						{#each r.proposals as proposal (proposal.destinationId)}
							<li><ProposalCard {proposal} destination={data.destinations[proposal.destinationId]} {t} /></li>
						{/each}
					</ol>
				{/if}
				<p class="muted small">{t.scheduledNotice} {t.dataVersion}: {r.dataVersion}</p>
			{/if}
		</section>
	</main>

	<footer class="bottom">
		<a href="/data-status?lang={data.locale}">{t.dataStatusLink}</a>
		<a href="https://github.com/riccardopontalti/dovearrivo">{t.sourceCode}</a>
	</footer>
</div>

<style>
	.shell {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1rem;
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 3.5rem;
	}
	.brand {
		font-weight: 700;
		font-size: 1.15rem;
		text-decoration: none;
		color: var(--text);
	}
	.top nav a,
	.bottom a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.layout {
		display: grid;
		gap: 1.5rem;
		padding-bottom: 2rem;
	}
	@media (min-width: 960px) {
		.layout {
			grid-template-columns: 24rem 1fr;
			align-items: start;
		}
		.search {
			position: sticky;
			top: 1rem;
		}
	}
	h1 {
		margin: 0.5rem 0 0;
		font-size: 1.9rem;
		line-height: 1.15;
	}
	.tagline {
		margin: 0.25rem 0 1rem;
		color: var(--muted);
	}
	form {
		display: grid;
		gap: 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 1rem;
	}
	.row {
		display: flex;
		gap: 0.75rem;
	}
	.row .field {
		flex: 1;
	}
	.grid {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: 1fr 1fr;
	}
	fieldset {
		border: 1px solid var(--border);
		border-radius: 10px;
		margin: 0;
		padding: 0.5rem 0.75rem 0.75rem;
	}
	legend {
		padding: 0 0.25rem;
		color: var(--muted);
	}
	button {
		min-height: 48px;
		border: 0;
		border-radius: 10px;
		background: var(--accent);
		color: var(--on-accent);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.7;
		cursor: progress;
	}
	.results h2 {
		margin: 0.5rem 0 0.25rem;
	}
	.summary {
		margin: 0 0 0.5rem;
		color: var(--muted);
	}
	.cards {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0;
		display: grid;
		gap: 0.9rem;
	}
	.notice,
	.alert,
	.empty {
		border-radius: 10px;
		padding: 0.75rem 1rem;
	}
	.notice {
		background: var(--notice);
	}
	.alert {
		background: var(--alert);
	}
	.empty {
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.empty p {
		margin: 0.25rem 0;
	}
	.choices {
		padding-left: 1.2rem;
	}
	.choices li {
		min-height: 44px;
		display: list-item;
	}
	.muted {
		color: var(--muted);
	}
	.small {
		font-size: 0.85rem;
	}
	.bottom {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		border-top: 1px solid var(--border);
		padding: 0.5rem 0 2rem;
		font-size: 0.92rem;
	}
</style>

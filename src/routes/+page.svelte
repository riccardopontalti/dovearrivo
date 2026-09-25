<script lang="ts">
	import { onMount } from 'svelte';
	import { navigating, page } from '$app/state';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import HeroBloom from '$lib/components/HeroBloom.svelte';
	import ProposalCard from '$lib/components/ProposalCard.svelte';
	import ResultsMap from '$lib/components/ResultsMap.svelte';
	import SearchForm from '$lib/components/SearchForm.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { longDate, placeLabel } from '$lib/format';
	import { fill, messages, type Messages } from '$lib/i18n';
	import { coordinateFrom, toParams } from '$lib/search-form';

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

	// Enhancements that need JavaScript: map selection, category filter, sheet handle.
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	const proposals = $derived(outcome?.kind === 'results' ? outcome.response.proposals : []);
	let selected = $state<string | undefined>();
	let category = $state('all');
	$effect.pre(() => {
		selected = proposals[0]?.destinationId;
		category = 'all';
	});
	const categoryOf = (id: string) => data.destinations[id]?.category ?? 'test';
	const categories = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of proposals) counts.set(categoryOf(p.destinationId), (counts.get(categoryOf(p.destinationId)) ?? 0) + 1);
		return [...counts.entries()];
	});
	const visible = $derived(category === 'all' ? proposals : proposals.filter((p) => categoryOf(p.destinationId) === category));

	let stage = $state<HTMLElement>();
	let sheet = $state<HTMLElement>();
	let sheetOpen = $state(false);
	const phone = () => matchMedia('(max-width: 959px)').matches;
	const smooth = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

	function onscroll() {
		if (sheet) sheetOpen = sheet.getBoundingClientRect().top < 80;
	}
	function toggleSheet() {
		if (!sheet) return;
		const top = sheetOpen ? 0 : window.scrollY + sheet.getBoundingClientRect().top - 8;
		window.scrollTo({ top, behavior: smooth() });
	}
	/** From a card: on phones bring the map back into view so the flight is visible. */
	function showOnMap(id: string) {
		selected = id;
		if (phone()) window.scrollTo({ top: 0, behavior: smooth() });
	}
	/** From the map: select and reveal the card. */
	function pickFromMap(id: string) {
		selected = id;
		category = 'all';
		document.getElementById(`card-${id}`)?.scrollIntoView({ block: 'nearest', behavior: smooth() });
	}

	/** Opens the search editor after an error or an ambiguous place; set only when that changes. */
	const openOnProblems = (open: boolean) => (el: HTMLDetailsElement) => {
		el.open = open;
	};

	function errorText(key: string): string {
		const template = (t as Record<string, string>)[key] ?? t.errInvalid;
		return fill(template, { from: data.status.availableFrom ?? '—', to: data.status.availableTo ?? '—' });
	}

	function chooseHref(stopId: string, name: string): string {
		return `/?${toParams({ ...data.form, from: stopId, fromQuery: name }, data.locale)}`;
	}

	const found = (n: number, tt: Messages) => (n === 1 ? tt.foundOne : fill(tt.foundMany, { n }));
	const categoryLabel = (c: string) => (t as Record<string, string>)[`cat_${c}`] ?? c;

	// The shared link repeats the search: the recipient always sees current timetables.
	let shared = $state(false);
	async function share() {
		const url = location.href;
		try {
			if (navigator.share) {
				await navigator.share({ title: t.appName, text: t.shareHint, url });
				return;
			}
			await navigator.clipboard.writeText(url);
			shared = true;
			setTimeout(() => (shared = false), 4000);
		} catch {
			// cancelled by the user
		}
	}
</script>

<svelte:head>
	<title>{t.appName} · {t.tagline}</title>
	<meta name="description" content={t.tagline} />
</svelte:head>

<svelte:window {onscroll} />

{#if busy}<div class="progress" aria-hidden="true"></div>{/if}

{#if !outcome}
	<div class="home">
		<section class="hero" aria-labelledby="hero-title">
			<Backdrop />
			<SiteHeader {t} locale={data.locale} {otherLocaleHref} overlay />
			<div class="hero-grid">
				<div class="pitch">
					<p class="eyebrow">{t.heroEyebrow}</p>
					<h1 id="hero-title">{t.heroTitle}</h1>
					<p class="lead">{t.heroLead}</p>
				</div>
				<div class="stage" bind:this={stage}></div>
				<div class="panel" id="content">
					{#if data.mock}<p class="notice">{t.mockNotice}</p>{/if}
					<SearchForm {t} locale={data.locale} form={data.form} status={data.status} {busy} bind:from bind:query />
				</div>
				<div class="bloom-caption">
					<HeroBloom {t} locale={data.locale} destinations={Object.values(data.destinations)} {stage} />
				</div>
			</div>
		</section>

		<section class="how" aria-labelledby="how-title">
			<h2 id="how-title">{t.howTitle}</h2>
			<ol>
				<li>
					<span class="step" aria-hidden="true">01</span>
					<h3>{t.how1Title}</h3>
					<p>{t.how1Text}</p>
				</li>
				<li>
					<span class="step" aria-hidden="true">02</span>
					<h3>{t.how2Title}</h3>
					<p>{t.how2Text}</p>
				</li>
				<li>
					<span class="step" aria-hidden="true">03</span>
					<h3>{t.how3Title}</h3>
					<p>{t.how3Text}</p>
				</li>
			</ol>
			<p class="data-line">
				{t.howData}
				<a href="/reachability?{toParams({ ...data.form, from, fromQuery: query }, data.locale)}">{t.reachLink}</a>
			</p>
			<SiteFooter {t} locale={data.locale} />
		</section>
	</div>
{:else}
	<div class="results-page" class:with-map={proposals.length > 0}>
		<SiteHeader {t} locale={data.locale} {otherLocaleHref} />
		<div class="split">
			<div class="list-col" id="content" bind:this={sheet}>
				{#if enhanced && proposals.length > 0}
					<button type="button" class="handle" aria-expanded={sheetOpen} aria-controls="content" onclick={toggleSheet}>
						<span class="grip" aria-hidden="true"></span>
						<span class="visually-hidden">{t.sheetToggle}</span>
					</button>
				{/if}

				<details class="edit" {@attach openOnProblems(outcome.kind !== 'results')}>
					<summary>
						<span class="edit-what">{data.form.fromQuery || '—'}</span>
						<span class="edit-when">{longDate(data.form.date, data.locale)} · {data.form.start}–{data.form.end}</span>
						<span class="edit-action">{t.editSearch}</span>
					</summary>
					<div class="edit-body">
						<SearchForm {t} locale={data.locale} form={data.form} status={data.status} {busy} bind:from bind:query />
					</div>
				</details>

				<section class="results" aria-live="polite" aria-busy={busy}>
					{#if data.mock}<p class="notice">{t.mockNotice}</p>{/if}

					{#if outcome.kind === 'error'}
						<p class="alert" role="alert">{errorText(outcome.error)}</p>
					{:else if outcome.kind === 'chooseStop'}
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
					{:else if outcome.kind === 'results'}
						{@const r = outcome.response}
						<div class="results-head">
							<h2>{t.resultsTitle}</h2>
							<button type="button" class="share" onclick={share}>
								<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
									><path
										d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
										stroke-linejoin="round"
									/></svg
								>
								{t.share}
							</button>
						</div>
						<p class="muted small" role="status">{shared ? t.linkCopied : ''}</p>
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
							<p class="muted found">{found(r.proposals.length, t)}. {t.rankingHelp}</p>
							{#if enhanced && categories.length > 1}
								<div class="filters" role="group" aria-label={t.categoryFilter}>
									<button type="button" class="chip" aria-pressed={category === 'all'} onclick={() => (category = 'all')}>
										{t.filterAll} <span class="count">{proposals.length}</span>
									</button>
									{#each categories as [c, n] (c)}
										<button type="button" class="chip" aria-pressed={category === c} onclick={() => (category = c)}>
											<CategoryIcon category={c} size={18} />
											{categoryLabel(c)} <span class="count">{n}</span>
										</button>
									{/each}
								</div>
							{/if}
							<ol class="cards">
								{#each visible as proposal, i (proposal.destinationId)}
									<li id="card-{proposal.destinationId}" style="--i:{Math.min(i, 8)}">
										<ProposalCard
											{proposal}
											destination={data.destinations[proposal.destinationId]}
											{t}
											date={data.form.date}
											start={data.form.start}
											end={data.form.end}
											selected={enhanced && selected === proposal.destinationId}
											onselect={enhanced ? () => showOnMap(proposal.destinationId) : undefined}
										/>
									</li>
								{/each}
							</ol>
						{/if}
						<p class="muted small">{t.scheduledNotice} {t.dataVersion}: {r.dataVersion}</p>
					{/if}
				</section>
				<SiteFooter {t} locale={data.locale} />
			</div>

			{#if proposals.length > 0}
				<div class="map-col">
					{#if enhanced}
						<ResultsMap {proposals} destinations={data.destinations} {selected} {t} locale={data.locale} onpick={pickFromMap} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ---------- shared ---------- */
	.progress {
		position: fixed;
		inset: 0 0 auto;
		height: 3px;
		z-index: 100;
		background: linear-gradient(90deg, transparent, var(--apricot), var(--teal), transparent);
		background-size: 50% 100%;
		background-repeat: no-repeat;
		animation: progress 1100ms var(--ease) infinite;
	}
	@keyframes progress {
		from {
			background-position: -50% 0;
		}
		to {
			background-position: 150% 0;
		}
	}
	.notice,
	.alert,
	.empty {
		border-radius: 12px;
		padding: 0.75rem 1rem;
	}
	.notice {
		background: var(--notice);
		color: var(--text);
		font-size: 0.9rem;
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
	.muted {
		color: var(--muted);
	}
	.small {
		font-size: 0.85rem;
	}

	/* ---------- home: hero ---------- */
	.hero {
		/* A dark island whatever the colour scheme: tokens are redefined for its contents. */
		--bg: #0b1523;
		--surface: #13223a;
		--surface-2: #1a2c47;
		--text: var(--snow);
		--muted: #b7c0cc;
		--accent: #5fd0c2;
		--border: rgb(255 255 255 / 0.16);
		--accent-soft: rgb(43 179 163 / 0.18);
		--notice: rgb(255 154 98 / 0.16);
		--focus: var(--apricot);
		position: relative;
		isolation: isolate;
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		color: var(--text);
		background: var(--night);
		overflow: hidden;
		color-scheme: dark;
	}
	.hero-grid {
		position: relative;
		flex: 1;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-areas: 'pitch' 'stage' 'caption' 'panel';
		gap: 0.75rem;
		padding: 0.5rem 1rem 1rem;
	}
	.pitch {
		grid-area: pitch;
		position: relative;
		z-index: 2;
		animation: rise 700ms 80ms var(--ease) both;
	}
	.eyebrow {
		margin: 0 0 0.6rem;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #ffd0a8;
	}
	h1 {
		margin: 0;
		font-size: clamp(2.1rem, 8.4vw, 4.6rem);
		font-weight: 560;
		line-height: 1.02;
		letter-spacing: -0.025em;
		text-wrap: balance;
		background: linear-gradient(100deg, #fff 30%, #ffd9bd 70%, #ff9a62);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.lead {
		margin: 0.9rem 0 0;
		max-width: 34rem;
		font-size: clamp(0.98rem, 2.6vw, 1.18rem);
		color: #dde3ea;
	}
	.stage {
		grid-area: stage;
		min-height: 22svh;
	}
	/* Not positioned: the bloom canvas inside must cover the whole grid, not this box. */
	.bloom-caption {
		grid-area: caption;
	}
	.bloom-caption :global(.caption) {
		padding: 0.6rem 0.85rem;
		border-radius: 14px;
		background: rgb(11 21 35 / 0.6);
		font-size: 0.8rem;
	}
	.bloom-caption :global(.clock-value) {
		font-size: 1.3rem;
	}
	.bloom-caption :global(.note),
	.bloom-caption :global(.clock-label) {
		display: none;
	}
	.panel {
		grid-area: panel;
		position: relative;
		z-index: 3;
		display: grid;
		gap: 0.75rem;
		padding: 1rem;
		margin: 0 -1rem -1rem;
		border-radius: 24px 24px 0 0;
		background: rgb(11 21 35 / 0.78);
		border: 1px solid var(--border);
		border-bottom: 0;
		box-shadow: 0 -20px 60px rgb(0 0 0 / 0.35);
		backdrop-filter: blur(18px) saturate(1.2);
		-webkit-backdrop-filter: blur(18px) saturate(1.2);
		animation: sheet 700ms 250ms var(--ease) both;
	}
	.panel .notice {
		margin: 0;
	}
	@media (min-width: 960px) {
		.hero-grid {
			grid-template-columns: minmax(26rem, 36rem) 1fr;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				'pitch stage'
				'panel stage'
				'panel caption';
			column-gap: clamp(2rem, 5vw, 5rem);
			row-gap: 1.75rem;
			padding: clamp(1.5rem, 5vh, 4rem) clamp(1.5rem, 4vw, 4rem) 2.5rem;
		}
		.stage {
			min-height: 0;
			margin: 1rem 0;
		}
		.panel {
			align-self: start;
			margin: 0;
			padding: 1.25rem;
			border-radius: 24px;
			border-bottom: 1px solid var(--border);
			box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.55);
		}
		.bloom-caption {
			justify-self: end;
			max-width: 26rem;
		}
		.bloom-caption :global(.caption) {
			padding: 0;
			background: none;
			font-size: 0.85rem;
		}
		.bloom-caption :global(.clock-value) {
			font-size: 1.6rem;
		}
		.bloom-caption :global(.note) {
			display: inline;
		}
		.bloom-caption :global(.clock-label) {
			display: block;
		}
	}

	/* ---------- home: how it works ---------- */
	.how {
		max-width: 72rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vw, 5rem) 1rem 0;
	}
	.how h2 {
		margin: 0 0 1.5rem;
		font-size: clamp(1.6rem, 4vw, 2.3rem);
	}
	.how ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
	}
	.how li {
		padding: 1.25rem;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
	}
	.step {
		font-family: var(--font-display);
		font-size: 1.9rem;
		font-weight: 600;
		color: var(--back);
		line-height: 1;
	}
	.how h3 {
		margin: 0.6rem 0 0.35rem;
		font-size: 1.2rem;
	}
	.how li p {
		margin: 0;
		color: var(--muted);
	}
	.data-line {
		margin: 1.5rem 0;
		color: var(--muted);
	}
	.data-line a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}

	/* ---------- results ---------- */
	.split {
		display: flex;
		flex-direction: column;
	}
	.list-col {
		position: relative;
		z-index: 2;
		padding: 0.5rem 1rem 0;
		background: var(--bg);
	}
	.map-col {
		order: -1;
		position: sticky;
		top: 0;
		z-index: 1;
		height: 46svh;
	}
	.with-map .list-col {
		margin-top: -1.5rem;
		border-radius: 24px 24px 0 0;
		box-shadow: 0 -12px 40px rgb(15 27 45 / 0.18);
		min-height: 60svh;
	}
	.handle {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-height: 32px;
		margin: -0.25rem 0 0.25rem;
		border: 0;
		background: none;
		cursor: pointer;
	}
	.grip {
		width: 2.75rem;
		height: 5px;
		border-radius: 999px;
		background: var(--border);
	}
	@media (min-width: 960px) {
		.split {
			display: grid;
			grid-template-columns: minmax(26rem, 36rem) 1fr;
			align-items: start;
		}
		.list-col,
		.with-map .list-col {
			margin: 0;
			border-radius: 0;
			box-shadow: none;
			min-height: 0;
			padding: 0.5rem clamp(1rem, 2.5vw, 2rem) 0;
		}
		.map-col {
			order: 0;
			height: 100vh;
			height: 100svh;
		}
		.handle {
			display: none;
		}
		.results-page:not(.with-map) .split {
			grid-template-columns: minmax(0, 44rem);
			justify-content: center;
		}
	}
	.edit {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.edit > summary {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas: 'what action' 'when action';
		align-items: center;
		column-gap: 0.75rem;
		min-height: 56px;
		padding: 0.55rem 1rem;
		cursor: pointer;
		list-style: none;
	}
	.edit > summary::-webkit-details-marker {
		display: none;
	}
	.edit-what {
		grid-area: what;
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.edit-when {
		grid-area: when;
		color: var(--muted);
		font-size: 0.88rem;
	}
	.edit-action {
		grid-area: action;
		color: var(--accent);
		font-weight: 600;
		font-size: 0.9rem;
	}
	.edit-body {
		padding: 0 1rem 1rem;
	}
	.results h2 {
		margin: 0;
		font-size: 1.7rem;
	}
	.results-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.25rem;
	}
	.results > h2 {
		margin-top: 1.25rem;
	}
	.share {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0 1rem;
		border-radius: 999px;
		background: transparent;
		color: var(--accent);
		border: 1px solid var(--accent);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.found {
		margin: 0 0 0.5rem;
		font-size: 0.92rem;
	}
	.filters {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding: 0.25rem 0 0.5rem;
		scrollbar-width: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex: none;
		min-height: 44px;
		padding: 0 0.9rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.chip[aria-pressed='true'] {
		background: var(--text);
		color: var(--bg);
		border-color: var(--text);
	}
	.count {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	.cards {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 1rem;
		display: grid;
		gap: 1rem;
	}
	.cards li {
		animation: rise 420ms calc(var(--i) * 60ms) var(--ease) both;
		scroll-margin: 1rem;
	}
	.choices {
		padding-left: 1.2rem;
	}
	.choices li {
		min-height: 44px;
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
	}
	@keyframes sheet {
		from {
			opacity: 0;
			transform: translateY(40px);
		}
	}
</style>

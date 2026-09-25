<script lang="ts">
	import { onMount } from 'svelte';
	import { navigating, page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import ProposalCard from '$lib/components/ProposalCard.svelte';
	import ReachScroll from '$lib/components/ReachScroll.svelte';
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
	const destinationList = $derived(Object.values(data.destinations));

	let from = $state('');
	let query = $state('');
	$effect.pre(() => {
		from = data.form.from;
		query = data.form.fromQuery;
	});

	// Enhancements that need JavaScript: map selection, category filter, sheet handle.
	let enhanced = $state(false);
	onMount(() => {
		enhanced = true;
		// A board row links to its card: select it.
		const id = location.hash.startsWith('#card-') ? decodeURIComponent(location.hash.slice(6)) : '';
		if (id && proposals.some((p) => p.destinationId === id)) selected = id;
	});

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
	const lines = $derived([t.heroLine1, t.heroLine2, t.heroLine3]);

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
		<SiteHeader {t} locale={data.locale} {otherLocaleHref} />
		<main id="content">
			<section class="hero" aria-labelledby="hero-title">
				<p class="kicker"><span class="pulse" aria-hidden="true"></span>{t.heroKicker}</p>
				<h1 id="hero-title">
					<span class="visually-hidden">{lines.join(' ')}</span>
					<span class="lines" aria-hidden="true">
						{#each lines as line, l (l)}
							<span class="line" class:mark={l === 2}>
								<span class="inner">
									{#each line.split(' ') as word, w (w)}<span class="word">{#each [...word] as ch, i (i)}<span class="ch" style="--i:{l * 7 + w * 3 + i}">{ch}</span>{/each}</span>{' '}{/each}
								</span>
							</span>
						{/each}
					</span>
				</h1>
				<div class="side">
					<p class="lead">{t.heroLead}</p>
					<div class="panel">
						{#if data.mock}<p class="notice">{t.mockNotice}</p>{/if}
						<SearchForm {t} locale={data.locale} form={data.form} status={data.status} {busy} bind:from bind:query />
					</div>
				</div>
			</section>

			{#if destinationList.length}
				<div class="ticker">
					<p class="visually-hidden">{t.tickerLabel}: {destinationList.map((d) => d.name).join(', ')}</p>
					<div class="track" aria-hidden="true">
						{#each [0, 1] as copy (copy)}
							<span class="run">
								{#each destinationList as d (d.id)}
									<span class="stop"><CategoryIcon category={d.category} size={22} />{d.name}</span>
								{/each}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<section class="board-section">
				<Board {t} locale={data.locale} />
			</section>

			<section class="how" aria-labelledby="how-title">
				<h2 id="how-title">{t.howTitle}</h2>
				<ol>
					<li>
						<span class="num" aria-hidden="true">01</span>
						<h3>{t.how1Title}</h3>
						<p>{t.how1Text}</p>
					</li>
					<li>
						<span class="num" aria-hidden="true">02</span>
						<h3>{t.how2Title}</h3>
						<p>{t.how2Text}</p>
					</li>
					<li>
						<span class="num" aria-hidden="true">03</span>
						<h3>{t.how3Title}</h3>
						<p>{t.how3Text}</p>
					</li>
				</ol>
				<p class="data-line">{t.howData}</p>
			</section>

			<ReachScroll {t} locale={data.locale} destinations={destinationList} />

			<footer class="outro">
				<p class="wordmark" aria-hidden="true">
					{#each [...t.appName] as ch, i (i)}<span style="--i:{i}">{ch}</span>{/each}
				</p>
				<div class="outro-links">
					<SiteFooter {t} locale={data.locale} />
				</div>
			</footer>
		</main>
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
							<p class="found">{found(r.proposals.length, t)}. <span class="muted">{t.rankingHelp}</span></p>
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
		height: 4px;
		z-index: 100;
		background: var(--signal);
		transform-origin: left;
		animation: progress 1400ms var(--ease-in-out) infinite;
	}
	@keyframes progress {
		0% {
			transform: scaleX(0);
		}
		60% {
			transform: scaleX(1);
			opacity: 1;
		}
		100% {
			transform: scaleX(1);
			opacity: 0;
		}
	}
	.notice,
	.alert,
	.empty {
		padding: 0.75rem 1rem;
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
	}
	.notice {
		background: var(--notice);
		font-size: 0.9rem;
	}
	.alert {
		background: var(--alert);
	}
	.empty {
		background: var(--surface);
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
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
		padding: clamp(1.25rem, 4vw, 3.5rem) clamp(1rem, 3vw, 2.5rem) clamp(2rem, 5vw, 4rem);
	}
	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.pulse {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--signal);
		box-shadow: 0 0 0 1.5px var(--ink);
		animation: blink 2.4s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			background: transparent;
		}
	}
	h1 {
		margin: 0;
		font-size: clamp(3rem, 8.6vw, 9.5rem);
		font-weight: 850;
		font-stretch: 100%;
		letter-spacing: -0.045em;
		line-height: 0.86;
	}
	@supports (animation-timeline: scroll()) {
		/* Scrolling squeezes the headline as it leaves. */
		h1 {
			animation: squeeze linear both;
			animation-timeline: scroll(root);
			animation-range: 0 70vh;
		}
		@keyframes squeeze {
			to {
				transform: translateY(-6vh) scale(0.94);
				transform-origin: left bottom;
				opacity: 0.25;
			}
		}
	}
	.line {
		display: block;
		overflow: hidden;
		padding: 0.04em 0 0.16em;
		margin-bottom: -0.16em;
	}
	.inner {
		position: relative;
		display: inline-block;
	}
	.mark .inner {
		color: #111;
		padding: 0 0.12em;
		margin-left: -0.12em;
	}
	.mark .inner::before {
		content: '';
		position: absolute;
		inset: 0.1em 0 -0.14em;
		z-index: -1;
		background: var(--signal);
		transform-origin: left;
		animation: wipe 700ms 900ms var(--ease-in-out) backwards;
	}
	.lines {
		position: relative;
		z-index: 0;
		display: block;
	}
	.word {
		display: inline-block;
		white-space: nowrap;
	}
	.ch {
		display: inline-block;
		transform-origin: left bottom;
		animation: rise 1000ms calc(var(--i) * 32ms + 80ms) var(--ease) backwards;
	}
	/* Transforms only: the headline never changes the layout while it animates. */
	@keyframes rise {
		from {
			transform: translateY(105%) rotate(6deg) scaleX(0.6);
		}
	}
	@keyframes wipe {
		from {
			transform: scaleX(0);
		}
	}
	.side {
		display: grid;
		gap: 1.25rem;
		align-content: end;
	}
	.lead {
		margin: 0;
		max-width: 34rem;
		font-size: clamp(1.05rem, 1.6vw, 1.25rem);
		line-height: 1.45;
		animation: fade 800ms 700ms var(--ease) backwards;
	}
	.panel {
		display: grid;
		gap: 0.9rem;
		padding: 1.1rem;
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: 8px 8px 0 var(--ink);
		animation: drop 700ms 200ms var(--ease) backwards;
	}
	.panel .notice {
		margin: 0;
	}
	@keyframes fade {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	/* The form does not move while it appears: it stays clickable from the first frame. */
	@keyframes drop {
		from {
			box-shadow: 0 0 0 var(--ink);
		}
	}
	@media (min-width: 1000px) {
		.hero {
			grid-template-columns: minmax(0, 1fr) minmax(22rem, 27rem);
			grid-template-areas: 'kicker kicker' 'title side';
			column-gap: clamp(2rem, 4vw, 4rem);
			align-items: end;
			min-height: calc(100svh - 12rem);
		}
		.kicker {
			grid-area: kicker;
			align-self: start;
		}
		h1 {
			grid-area: title;
		}
		.side {
			grid-area: side;
		}
	}

	/* ---------- ticker ---------- */
	.ticker {
		overflow: hidden;
		border-block: 1.5px solid var(--rule);
		background: var(--signal);
		color: #111;
	}
	.track {
		display: flex;
		width: max-content;
		animation: ticker 60s linear infinite;
	}
	.ticker:hover .track {
		animation-play-state: paused;
	}
	.run {
		display: flex;
	}
	.stop {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 1.6rem 0.7rem 0;
		font-size: 1.15rem;
		font-weight: 750;
		font-stretch: 85%;
		white-space: nowrap;
	}
	.stop::after {
		content: '';
		width: 6px;
		height: 6px;
		margin-left: 1.6rem;
		border-radius: 50%;
		background: #111;
	}
	@keyframes ticker {
		to {
			transform: translateX(-50%);
		}
	}

	/* ---------- board ---------- */
	.board-section {
		padding: clamp(2rem, 6vw, 5rem) clamp(0.75rem, 3vw, 2.5rem);
	}

	/* ---------- how it works ---------- */
	.how {
		padding: clamp(2.5rem, 7vw, 6rem) clamp(1rem, 3vw, 2.5rem);
		border-top: 1.5px solid var(--rule);
	}
	.how h2 {
		margin: 0 0 2rem;
		font-size: clamp(2.4rem, 6vw, 5rem);
	}
	.how ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		border-top: 1.5px solid var(--rule);
	}
	.how li {
		padding: 1.25rem 1.25rem 1.5rem 0;
	}
	.how li + li {
		border-top: 1px solid var(--hair);
	}
	@media (min-width: 800px) {
		.how li + li {
			border-top: 0;
			border-left: 1px solid var(--hair);
			padding-left: 1.25rem;
		}
	}
	.num {
		display: block;
		font-family: var(--font-mono);
		font-size: clamp(2.6rem, 5vw, 4rem);
		font-weight: 700;
		letter-spacing: -0.06em;
		line-height: 1;
	}
	.how h3 {
		margin: 1rem 0 0.5rem;
		font-size: 1.6rem;
	}
	.how li p {
		margin: 0;
		color: var(--muted);
		max-width: 26rem;
	}
	.data-line {
		margin: 2rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--muted);
	}
	@supports (animation-timeline: view()) {
		.how li {
			animation: reveal linear both;
			animation-timeline: view();
			animation-range: entry 0% entry 60%;
		}
		@keyframes reveal {
			from {
				opacity: 0;
				transform: translateY(40px);
			}
		}
	}

	/* ---------- outro ---------- */
	.outro {
		border-top: 1.5px solid var(--rule);
		padding: 2rem clamp(1rem, 3vw, 2.5rem) 0;
		overflow: hidden;
	}
	.wordmark {
		display: flex;
		margin: 0;
		font-size: clamp(4rem, 19vw, 22rem);
		font-weight: 850;
		font-stretch: 72%;
		letter-spacing: -0.025em;
		line-height: 0.8;
	}
	/* Same split-flap hinge as the header wordmark. */
	.wordmark span {
		display: inline-block;
		background: linear-gradient(var(--ink) 0 55%, transparent 55% 58.5%, var(--ink) 58.5%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	@supports (animation-timeline: view()) {
		.wordmark span {
			animation: letter linear both;
			animation-timeline: view();
			animation-range: entry calc(var(--i) * 3%) cover 45%;
		}
		@keyframes letter {
			from {
				transform: translateY(70%) scaleX(1.5);
				opacity: 0;
			}
		}
	}

	/* ---------- results ---------- */
	.split {
		display: flex;
		flex-direction: column;
	}
	.list-col {
		position: relative;
		z-index: 2;
		padding: 0.75rem 1rem 0;
		background: var(--paper);
	}
	.map-col {
		order: -1;
		position: sticky;
		top: 0;
		z-index: 1;
		height: 46svh;
		border-bottom: 1.5px solid var(--rule);
	}
	.with-map .list-col {
		margin-top: -1.25rem;
		border-top: 1.5px solid var(--rule);
		border-radius: 16px 16px 0 0;
		min-height: 60svh;
	}
	.handle {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-height: 32px;
		margin: -0.5rem 0 0.25rem;
		border: 0;
		background: none;
		cursor: pointer;
	}
	.grip {
		width: 3rem;
		height: 5px;
		border-radius: 999px;
		background: var(--ink);
	}
	@media (min-width: 960px) {
		.split {
			display: grid;
			grid-template-columns: minmax(26rem, 38rem) 1fr;
			align-items: start;
		}
		.list-col,
		.with-map .list-col {
			margin: 0;
			border-radius: 0;
			border-top: 0;
			min-height: 0;
			padding: 1rem clamp(1rem, 2.5vw, 2rem) 0;
		}
		.with-map .list-col {
			border-right: 1.5px solid var(--rule);
		}
		.map-col {
			order: 0;
			height: 100vh;
			height: 100svh;
			border-bottom: 0;
		}
		.handle {
			display: none;
		}
		.results-page:not(.with-map) .split {
			grid-template-columns: minmax(0, 46rem);
			justify-content: center;
		}
	}
	.edit {
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
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
		font-weight: 800;
		font-stretch: 85%;
		font-size: 1.15rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.edit-when {
		grid-area: when;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted);
	}
	.edit-action {
		grid-area: action;
		padding: 0.35rem 0.7rem;
		border: 1.5px solid var(--rule);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.edit[open] .edit-action {
		background: var(--ink);
		color: var(--paper);
	}
	.edit-body {
		padding: 0 1rem 1rem;
	}
	.results h2 {
		margin: 0;
		font-size: clamp(2.2rem, 4vw, 3.2rem);
	}
	.results-head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.75rem;
	}
	.results > h2 {
		margin-top: 1.5rem;
	}
	.share {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0 1rem;
		border: 1.5px solid var(--rule);
		border-radius: 999px;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-weight: 650;
		cursor: pointer;
	}
	.share:hover {
		background: var(--signal);
		color: #111;
		border-color: #111;
	}
	.found {
		margin: 0 0 0.75rem;
		font-size: 0.95rem;
	}
	.filters {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		padding: 0.25rem 0 0.75rem;
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
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
	}
	.chip[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.count {
		font-family: var(--font-mono);
		font-size: 0.8em;
		opacity: 0.75;
	}
	.cards {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0 1.5rem;
		display: grid;
		gap: 1.25rem;
	}
	.cards li {
		animation: card 600ms calc(var(--i) * 80ms) var(--ease) backwards;
		scroll-margin: 1rem;
	}
	@keyframes card {
		from {
			opacity: 0;
			transform: translateY(30px) rotate(-1.5deg);
		}
	}
	.choices {
		padding-left: 1.2rem;
	}
	.choices li {
		min-height: 44px;
	}
</style>

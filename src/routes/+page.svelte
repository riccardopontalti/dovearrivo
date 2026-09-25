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
	import Wordmark from '$lib/components/Wordmark.svelte';
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

	/** Arms a card's scene, then plays it once when the card comes into view. Without
	 * JavaScript the scenes show their final state. */
	const reveal = (el: HTMLElement) => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		el.classList.add('armed');
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					el.classList.add('in');
					io.disconnect();
				}
			},
			{ threshold: 0.45 }
		);
		io.observe(el);
		return () => io.disconnect();
	};

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
				<div class="board-slot">
					<Board {t} locale={data.locale} />
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

			<section class="how" aria-labelledby="how-title">
				<h2 id="how-title">{t.howTitle}</h2>
				<ol class="stack">
					<li class="card c1" style="--i:0" {@attach reveal}>
						<div class="scene" aria-hidden="true">
							<div class="mini-field">
								<span class="mini-label">{t.from}</span>
								<span class="mini-value"><span class="typed">Trento</span><span class="caret"></span></span>
							</div>
							<div class="mini-times">
								<span class="mini-chip" style="--d:1">09:00</span>
								<span class="mini-dash">→</span>
								<span class="mini-chip" style="--d:2">19:00</span>
							</div>
						</div>
						<div class="card-text">
							<span class="num" aria-hidden="true">01</span>
							<h3>{t.how1Title}</h3>
							<p>{t.how1Text}</p>
						</div>
					</li>
					<li class="card c2" style="--i:1" {@attach reveal}>
						<div class="scene" aria-hidden="true">
							<div class="mini-ribbon">
								<span class="seg out"></span>
								<span class="seg stay"></span>
								<span class="seg back"></span>
								<span class="flag"></span>
							</div>
							<div class="mini-hours"><span>09</span><span>12</span><span>15</span><span>19</span></div>
							<span class="mini-ok">✓ {fill(t.ribbonBackBy, { time: '19:00' })}</span>
						</div>
						<div class="card-text">
							<span class="num" aria-hidden="true">02</span>
							<h3>{t.how2Title}</h3>
							<p>{t.how2Text}</p>
						</div>
					</li>
					<li class="card c3" style="--i:2" {@attach reveal}>
						<div class="scene" aria-hidden="true">
							<div class="mini-ticket">
								<span class="mini-stub"></span>
								<span class="mini-lines"><span></span><span></span><span></span></span>
								<span class="mini-stamp">{t.backup}<b>18:40</b></span>
							</div>
						</div>
						<div class="card-text">
							<span class="num" aria-hidden="true">03</span>
							<h3>{t.how3Title}</h3>
							<p>{t.how3Text}</p>
						</div>
					</li>
				</ol>
				<p class="data-line">{t.howData}</p>
			</section>

			<ReachScroll {t} locale={data.locale} destinations={destinationList} />

			<footer class="outro">
				<p class="wordmark" aria-hidden="true"><Wordmark text={t.appName} /></p>
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
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'kicker' 'title' 'side' 'board';
		gap: 1.25rem;
		padding: clamp(1.25rem, 3vw, 2.5rem) clamp(1rem, 3vw, 2.5rem) clamp(2rem, 4vw, 3rem);
	}
	.kicker {
		grid-area: kicker;
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
		grid-area: title;
		margin: 0;
		font-size: clamp(3rem, 12.5vw, 6.6rem);
		font-weight: 850;
		letter-spacing: -0.045em;
		line-height: 0.86;
	}
	@supports (animation-timeline: scroll()) {
		/* Scrolling lifts and fades the headline as it leaves. */
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
		grid-area: side;
		display: grid;
		gap: 1.25rem;
	}
	.lead {
		margin: 0;
		max-width: 34rem;
		font-size: clamp(1.05rem, 1.5vw, 1.2rem);
		line-height: 1.45;
		animation: fade 800ms 600ms var(--ease) backwards;
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
	.board-slot {
		grid-area: board;
		min-width: 0;
		margin-top: 1rem;
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
	/* Desktop: words and search on the left, the departures board on the right, all on the
	   first screen. */
	@media (min-width: 1100px) {
		.hero {
			grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
			grid-template-rows: auto auto 1fr;
			grid-template-areas:
				'kicker board'
				'title board'
				'side board';
			column-gap: clamp(2rem, 4vw, 4.5rem);
			row-gap: 1.5rem;
			align-items: start;
		}
		h1 {
			font-size: clamp(3.4rem, 5.6vw, 6.4rem);
		}
		.board-slot {
			margin-top: 0;
			align-self: center;
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

	/* ---------- how it works: stacked cards ---------- */
	.how {
		padding: clamp(2.5rem, 7vw, 6rem) clamp(1rem, 3vw, 2.5rem) clamp(2rem, 5vw, 4rem);
		border-top: 1.5px solid var(--rule);
	}
	.how h2 {
		margin: 0 0 1.5rem;
		font-size: clamp(2.4rem, 6vw, 5rem);
	}
	.stack {
		list-style: none;
		margin: 0;
		padding: 0 0 12vh;
		display: grid;
		gap: 12vh;
	}
	.card {
		position: sticky;
		top: calc(5rem + var(--i) * 1.6rem);
		display: grid;
		grid-template-columns: 1fr;
		min-height: min(26rem, 70svh);
		border: 1.5px solid var(--rule);
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 -10px 30px -12px rgb(0 0 0 / 0.25);
	}
	.c1 {
		background: var(--surface);
	}
	.c2 {
		background: var(--signal);
		color: #111;
	}
	.c3 {
		background: #111;
		color: #ede9df;
		border-color: #111;
	}
	.scene {
		position: relative;
		display: grid;
		place-content: center;
		gap: 1rem;
		min-height: 12rem;
		padding: 1.5rem;
		border-bottom: 1.5px dashed currentColor;
	}
	.card-text {
		padding: 1.25rem 1.5rem 1.5rem;
		align-self: end;
	}
	.num {
		display: block;
		font-family: var(--font-mono);
		font-size: clamp(2.4rem, 5vw, 3.6rem);
		font-weight: 700;
		letter-spacing: -0.06em;
		line-height: 1;
	}
	.card h3 {
		margin: 0.8rem 0 0.5rem;
		font-size: clamp(1.6rem, 3vw, 2.4rem);
	}
	.card p {
		margin: 0;
		max-width: 28rem;
		opacity: 0.85;
	}
	@media (min-width: 800px) {
		.card {
			grid-template-columns: 1.1fr 1fr;
		}
		.scene > * {
			scale: 1.3;
		}
		.scene {
			border-bottom: 0;
			border-right: 1.5px dashed currentColor;
		}
	}
	/* Scene 1: typing a place, then the time window. */
	.mini-field {
		width: min(20rem, 70vw);
		padding: 0.6rem 0.8rem;
		border: 1.5px solid var(--rule);
		border-radius: 4px;
		background: var(--paper);
		box-shadow: 5px 5px 0 var(--ink);
	}
	.mini-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.mini-value {
		display: inline-flex;
		align-items: center;
		font-size: 1.6rem;
		font-weight: 750;
		font-stretch: 85%;
	}
	.typed {
		display: inline-block;
		overflow: hidden;
		white-space: nowrap;
		width: 6ch;
	}
	.caret {
		width: 2px;
		height: 1.3em;
		margin-left: 2px;
		background: var(--ink);
		animation: caret 1s steps(1) infinite;
	}
	@keyframes caret {
		50% {
			opacity: 0;
		}
	}
	.mini-times {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--font-mono);
		font-weight: 700;
	}
	.mini-chip {
		padding: 0.35rem 0.7rem;
		border: 1.5px solid var(--rule);
		border-radius: 999px;
		background: var(--signal);
		color: #111;
	}
	:global(.armed):not(:global(.in)) .typed {
		width: 0;
	}
	:global(.armed):not(:global(.in)) .mini-chip {
		transform: scale(0.4);
		opacity: 0;
	}
	:global(.armed) .typed {
		transition: width 900ms steps(6) 200ms;
	}
	:global(.armed) .mini-chip {
		transition:
			transform 450ms cubic-bezier(0.3, 1.6, 0.5, 1) calc(1000ms + var(--d) * 180ms),
			opacity 200ms calc(1000ms + var(--d) * 180ms);
	}
	/* Scene 2: the day ribbon draws itself. */
	.mini-ribbon {
		position: relative;
		width: min(22rem, 72vw);
		height: 18px;
		border-bottom: 2px solid #111;
	}
	.seg {
		position: absolute;
		top: 0;
		bottom: 0;
		transform-origin: left;
	}
	.seg.out {
		left: 0;
		width: 12%;
		background: #111;
	}
	.seg.stay {
		left: 12%;
		width: 58%;
		top: 4px;
		bottom: 4px;
		background: repeating-linear-gradient(135deg, #111 0 1.5px, transparent 1.5px 6px);
	}
	.seg.back {
		left: 70%;
		width: 12%;
		background: #fff8d6;
		box-shadow: inset 0 0 0 2px #111;
	}
	.flag {
		position: absolute;
		right: 0;
		top: -10px;
		bottom: -10px;
		width: 3px;
		background: #111;
	}
	.mini-hours {
		display: flex;
		justify-content: space-between;
		width: min(22rem, 72vw);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
	}
	.mini-ok {
		justify-self: start;
		padding: 0.3rem 0.7rem;
		border: 1.5px solid #111;
		border-radius: 999px;
		background: #fff8d6;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
	}
	:global(.armed):not(:global(.in)) .seg {
		transform: scaleX(0);
	}
	:global(.armed):not(:global(.in)) .mini-ok {
		opacity: 0;
		transform: translateY(8px);
	}
	:global(.armed) .seg {
		transition: transform 500ms var(--ease);
	}
	:global(.armed) .seg.stay {
		transition-delay: 450ms;
		transition-duration: 900ms;
	}
	:global(.armed) .seg.back {
		transition-delay: 1300ms;
	}
	:global(.armed) .mini-ok {
		transition:
			opacity 300ms 1800ms,
			transform 300ms 1800ms var(--ease);
	}
	/* Scene 3: a ticket gets its backup stamp. */
	.mini-ticket {
		position: relative;
		display: flex;
		width: min(20rem, 70vw);
		height: 8rem;
		border-radius: 8px;
		background: #ede9df;
		overflow: hidden;
	}
	.mini-stub {
		width: 28%;
		background: var(--signal);
		border-right: 2px dashed #111;
	}
	.mini-lines {
		flex: 1;
		display: grid;
		align-content: center;
		gap: 0.6rem;
		padding: 1rem;
	}
	.mini-lines span {
		height: 8px;
		border-radius: 4px;
		background: #111;
		opacity: 0.8;
	}
	.mini-lines span:nth-child(2) {
		width: 70%;
		opacity: 0.35;
	}
	.mini-lines span:nth-child(3) {
		width: 50%;
		opacity: 0.35;
	}
	.mini-stamp {
		position: absolute;
		right: 0.8rem;
		bottom: 0.7rem;
		display: grid;
		padding: 0.25rem 0.6rem;
		border: 3px double #111;
		border-radius: 6px;
		color: #111;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transform: rotate(-8deg);
		background: rgb(255 199 0 / 0.35);
	}
	.mini-stamp b {
		font-size: 1.1rem;
		letter-spacing: 0;
	}
	:global(.armed):not(:global(.in)) .mini-stamp {
		opacity: 0;
		transform: scale(2.2) rotate(-20deg);
	}
	:global(.armed) .mini-stamp {
		transition:
			transform 420ms cubic-bezier(0.3, 1.6, 0.5, 1) 600ms,
			opacity 120ms 600ms;
	}
	.data-line {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--muted);
	}

	/* ---------- outro ---------- */
	.outro {
		border-top: 1.5px solid var(--rule);
		padding: 2rem clamp(1rem, 3vw, 2.5rem) 0;
		overflow: hidden;
	}
	.wordmark {
		margin: 0 0 0 0.05em;
		font-size: clamp(3rem, 13.5vw, 15rem);
		line-height: 1;
		padding-bottom: 0.1em;
	}
	@supports (animation-timeline: view()) {
		.wordmark {
			animation: outro linear both;
			animation-timeline: view();
			animation-range: entry 0% cover 40%;
		}
		@keyframes outro {
			from {
				transform: translateY(35%) scale(0.92);
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

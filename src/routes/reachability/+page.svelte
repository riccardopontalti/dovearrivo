<script lang="ts">
	import { navigating, page } from '$app/state';
	import PlacePicker from '$lib/components/PlacePicker.svelte';
	import ReachabilityMap from '$lib/components/ReachabilityMap.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { clock, placeLabel } from '$lib/format';
	import { fill, messages } from '$lib/i18n';
	import { BAND_LIMITS, countByBand } from '$lib/reach-bands';
	import { coordinateFrom, OPTIONS, parseFrom, toParams } from '$lib/search-form';
	import { localToMillis } from '$lib/domain/time';

	let { data } = $props();
	const t = $derived(messages(data.locale));
	const outcome = $derived(data.outcome);
	const busy = $derived(navigating.to?.url.pathname === '/reachability');
	const TABLE_ROWS = 300;

	let from = $state('');
	let query = $state('');
	$effect.pre(() => {
		from = data.form.from;
		query = data.form.fromQuery;
	});

	const otherLocale = $derived(data.locale === 'it' ? 'en' : 'it');
	const otherLocaleHref = $derived.by(() => {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('lang', otherLocale);
		return `/reachability?${params}`;
	});
	const bandLabels = $derived([t.reachBand0, t.reachBand1, t.reachBand2, t.reachBand3, t.reachBand4]);
	const originPoint = $derived.by(() => {
		const o = parseFrom(data.form.from);
		return 'point' in o ? o.point : undefined;
	});
	const until = $derived(clock(new Date(localToMillis(data.form.date, data.form.start) + data.minutes * 60_000).toISOString()));

	function errorText(key: string): string {
		const template = (t as Record<string, string>)[key] ?? t.errInvalid;
		return fill(template, { from: data.status.availableFrom ?? '—', to: data.status.availableTo ?? '—' });
	}
	const minutesLabel = (n: number) => (n < 60 ? `${n} min` : n % 60 === 0 ? `${n / 60} h` : `${Math.floor(n / 60)} h ${n % 60}`);
</script>

<svelte:head>
	<title>{t.reachTitle} · {t.appName}</title>
</svelte:head>

<div class="shell">
	<SiteHeader {t} locale={data.locale} {otherLocaleHref} current="reach" />

	<main id="content">
		<h1>{t.reachTitle}</h1>
		<p class="note">{t.reachNote}</p>

		<form method="GET" action="/reachability">
			<input type="hidden" name="lang" value={data.locale} />
			<div class="picker"><PlacePicker {t} bind:from bind:query /></div>
			<div class="field">
				<label for="date">{t.date}</label>
				<input id="date" name="date" type="date" required value={data.form.date} min={data.status.availableFrom ?? undefined} max={data.status.availableTo ?? undefined} />
			</div>
			<div class="field">
				<label for="start">{t.start}</label>
				<input id="start" name="start" type="time" step="900" required value={data.form.start} />
			</div>
			<div class="field">
				<label for="minutes">{t.reachWithin}</label>
				<select id="minutes" name="minutes" value={data.minutes}>
					{#each data.minuteOptions as o (o)}<option value={o}>{minutesLabel(o)}</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="maxWalkMinutes">{t.maxWalk}</label>
				<select id="maxWalkMinutes" name="maxWalkMinutes" value={data.form.maxWalkMinutes}>
					{#each OPTIONS.maxWalkMinutes as o (o)}<option value={o}>{o} min</option>{/each}
				</select>
			</div>
			<div class="field">
				<label for="maxTransfers">{t.maxTransfers}</label>
				<select id="maxTransfers" name="maxTransfers" value={data.form.maxTransfers}>
					{#each OPTIONS.maxTransfers as o (o)}<option value={o}>{o}</option>{/each}
				</select>
			</div>
			<button type="submit" disabled={busy}>{busy ? t.searching : t.reachSubmit}</button>
		</form>

		<p><a href="/?{toParams({ ...data.form }, data.locale)}">{t.searchTripsLink}</a></p>

		<section aria-live="polite" aria-busy={busy}>
			{#if outcome?.kind === 'error'}
				<p class="alert" role="alert">{errorText(outcome.error)}</p>
			{:else if outcome?.kind === 'chooseStop'}
				<h2>{t.chooseStop}</h2>
				<ul>
					{#each outcome.places as place (`${place.kind}:${place.stopId ?? coordinateFrom(place.point)}`)}
						<li>
							<a href="/reachability?{toParams({ ...data.form, from: place.stopId ?? coordinateFrom(place.point), fromQuery: place.name }, data.locale)}&minutes={data.minutes}">{place.name}</a>
							<span class="muted">{placeLabel(place, t)}</span>
						</li>
					{/each}
				</ul>
			{:else if outcome?.kind === 'result'}
				{@const r = outcome.result}
				{@const counts = countByBand(r.places)}
				<h2>{fill(r.places.length === 1 ? t.reachSummaryOne : t.reachSummary, { n: r.places.length, time: until })}</h2>
				{#if r.places.length === 0}
					<p>{t.reachNone}</p>
				{:else}
					<figure>
						<figcaption>
							<span class="legend-title">{t.reachBands}</span>
							<ul class="legend">
								{#each BAND_LIMITS as limit, i (limit)}
									{#if i === 0 || BAND_LIMITS[i - 1] < data.minutes}
										<li><span class="dot" style="background:var(--band-{i})"></span>{bandLabels[i]} · {counts[i]}</li>
									{/if}
								{/each}
							</ul>
						</figcaption>
						{#key r}
							<ReachabilityMap result={r} origin={originPoint} {t} locale={data.locale} />
						{/key}
					</figure>
					<details>
						<summary>{t.reachTable}</summary>
						{#if r.places.length > TABLE_ROWS}<p class="muted">{fill(t.reachTableMore, { n: TABLE_ROWS })}</p>{/if}
						<table>
							<thead><tr><th scope="col">{t.colStop}</th><th scope="col">{t.colMinutes}</th><th scope="col">{t.colTransfers}</th></tr></thead>
							<tbody>
								{#each r.places.slice(0, TABLE_ROWS) as p, i (i)}
									<tr><td>{p.name}</td><td>{p.minutes}</td><td>{p.transfers}</td></tr>
								{/each}
							</tbody>
						</table>
					</details>
				{/if}
				<p class="muted small">{t.scheduledNotice} {t.dataVersion}: {r.dataVersion}</p>
			{/if}
		</section>
	</main>
</div>

<style>
	.shell {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1rem 3rem;
	}
	.shell :global(.top) {
		padding: 0;
	}
	p > a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	h1 {
		margin: 0.5rem 0 0.25rem;
	}
	.note {
		color: var(--muted);
		max-width: 48rem;
	}
	form {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		align-items: end;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		padding: 1rem;
	}
	.picker {
		grid-column: 1 / -1;
	}
	button {
		min-height: 44px;
		border: 0;
		border-radius: 12px;
		background: var(--glow);
		color: var(--on-glow);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	figure {
		margin: 0.5rem 0 1rem;
	}
	figcaption {
		display: flex;
		gap: 0.5rem 1rem;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.legend-title {
		font-weight: 600;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.dot {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 50%;
		margin-right: 0.35rem;
		vertical-align: -0.1rem;
		box-shadow: 0 0 0 2px var(--surface);
	}
	.alert {
		background: var(--alert);
		border-radius: 10px;
		padding: 0.75rem 1rem;
	}
	summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		cursor: pointer;
		color: var(--accent);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		text-align: left;
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}
	.muted {
		color: var(--muted);
	}
	.small {
		font-size: 0.85rem;
	}
</style>

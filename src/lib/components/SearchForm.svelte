<script lang="ts">
	// The search: one place field and one button, with day, time window and filters one tap
	// away in a disclosure. A plain GET form, so it works without JavaScript; with it, the
	// summary follows the values and the quick day choices appear.
	import { onMount } from 'svelte';
	import type { DataStatus } from '$lib/api/types';
	import { localDate } from '$lib/domain/time';
	import { minutesLabel, shortDate } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import { OPTIONS, quickDays, type SearchForm } from '$lib/search-form';
	import PlacePicker from './PlacePicker.svelte';

	let {
		t,
		locale,
		form,
		status,
		busy = false,
		from = $bindable(''),
		query = $bindable('')
	}: {
		t: Messages;
		locale: 'it' | 'en';
		form: SearchForm;
		status: Pick<DataStatus, 'availableFrom' | 'availableTo'>;
		busy?: boolean;
		from?: string;
		query?: string;
	} = $props();

	// Writable deriveds: they follow a new search and can be edited; on the server they
	// already hold the values, so the form works without JavaScript.
	let date = $derived(form.date);
	let start = $derived(form.start);
	let end = $derived(form.end);

	let today = $state<string | null>(null);
	onMount(() => (today = localDate(Date.now())));
	const days = $derived(today ? quickDays(today, status.availableFrom, status.availableTo) : []);
	const dayLabel = (d: { date: string; kind: string }) =>
		d.kind === 'today' ? t.dayToday : d.kind === 'tomorrow' ? t.dayTomorrow : shortDate(d.date, locale);
	const summary = $derived(fill(t.whenSummary, { date: date ? shortDate(date, locale) : '—', start, end }));
</script>

<form method="GET" action="/" class="search">
	<input type="hidden" name="lang" value={locale} />
	<PlacePicker {t} bind:from bind:query />

	<details class="when">
		<summary>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
				><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" /><path
					d="M12 7.5V12l3 2"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
				/></svg
			>
			<span class="summary-value">{summary}</span>
			<span class="summary-edit">{t.whenAndFilters}</span>
		</summary>

		<div class="when-body">
			{#if days.length}
				<div class="days" role="group" aria-label={t.quickDays}>
					{#each days as d (d.date)}
						<button type="button" class="chip" aria-pressed={date === d.date} onclick={() => (date = d.date)}>{dayLabel(d)}</button>
					{/each}
				</div>
			{/if}
			<div class="row three">
				<div class="field">
					<label for="date">{t.date}</label>
					<input
						id="date"
						name="date"
						type="date"
						required
						bind:value={date}
						min={status.availableFrom ?? undefined}
						max={status.availableTo ?? undefined}
					/>
				</div>
				<div class="field">
					<label for="start">{t.start}</label>
					<input id="start" name="start" type="time" step="900" required bind:value={start} />
				</div>
				<div class="field">
					<label for="end">{t.end}</label>
					<input id="end" name="end" type="time" step="900" required bind:value={end} />
				</div>
			</div>

			<fieldset>
				<legend>{t.filters}</legend>
				<div class="grid">
					<div class="field">
						<label for="maxJourneyMinutes">{t.maxJourney}</label>
						<select id="maxJourneyMinutes" name="maxJourneyMinutes" value={form.maxJourneyMinutes}>
							{#each OPTIONS.maxJourneyMinutes as o (o)}<option value={o}>{minutesLabel(o)}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="minStayMinutes">{t.minStay}</label>
						<select id="minStayMinutes" name="minStayMinutes" value={form.minStayMinutes}>
							{#each OPTIONS.minStayMinutes as o (o)}<option value={o}>{minutesLabel(o)}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="maxWalkMinutes">{t.maxWalk}</label>
						<select id="maxWalkMinutes" name="maxWalkMinutes" value={form.maxWalkMinutes} aria-describedby="walkHelp">
							{#each OPTIONS.maxWalkMinutes as o (o)}<option value={o}>{minutesLabel(o)}</option>{/each}
						</select>
						<p id="walkHelp" class="help">{t.maxWalkHelp}</p>
					</div>
					<div class="field">
						<label for="maxTransfers">{t.maxTransfers}</label>
						<select id="maxTransfers" name="maxTransfers" value={form.maxTransfers}>
							{#each OPTIONS.maxTransfers as o (o)}<option value={o}>{o}</option>{/each}
						</select>
					</div>
				</div>
			</fieldset>
		</div>
	</details>

	<button type="submit" class="go" disabled={busy}>
		<span>{busy ? t.searching : t.submit}</span>
		{#if !busy}
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
				><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg
			>
		{/if}
	</button>
</form>

<style>
	.search {
		display: grid;
		gap: 0.85rem;
	}
	.when {
		border: 1px solid var(--border);
		border-radius: 12px;
		background: color-mix(in srgb, var(--surface) 60%, transparent);
	}
	.when > summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 48px;
		padding: 0 0.85rem;
		cursor: pointer;
		list-style: none;
		border-radius: 12px;
	}
	.when > summary::-webkit-details-marker {
		display: none;
	}
	.summary-value {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.summary-edit {
		margin-left: auto;
		color: var(--accent);
		font-size: 0.9rem;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.summary-edit::after {
		content: '';
		width: 0.45rem;
		height: 0.45rem;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg) translateY(-2px);
		transition: transform 200ms var(--ease);
	}
	.when[open] .summary-edit::after {
		transform: rotate(225deg) translateY(-2px);
	}
	.when-body {
		display: grid;
		gap: 0.85rem;
		padding: 0.25rem 0.85rem 0.9rem;
		animation: open 250ms var(--ease);
	}
	.days {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		min-height: 44px;
		padding: 0 0.95rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 150ms var(--ease),
			border-color 150ms var(--ease);
	}
	.chip[aria-pressed='true'] {
		background: var(--accent-soft);
		border-color: var(--accent);
		font-weight: 650;
	}
	.row {
		display: grid;
		gap: 0.75rem;
	}
	.three {
		grid-template-columns: 1.3fr 1fr 1fr;
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
	.go {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		min-height: 52px;
		border: 0;
		border-radius: 14px;
		background: var(--glow);
		color: var(--on-glow);
		font: inherit;
		font-size: 1.08rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow:
			0 10px 30px -10px rgb(255 154 98 / 0.7),
			inset 0 1px 0 rgb(255 255 255 / 0.4);
		transition:
			transform 150ms var(--ease),
			box-shadow 150ms var(--ease),
			filter 150ms var(--ease);
	}
	.go:hover {
		transform: translateY(-1px);
		filter: brightness(1.05);
		box-shadow:
			0 14px 34px -10px rgb(255 154 98 / 0.85),
			inset 0 1px 0 rgb(255 255 255 / 0.4);
	}
	.go:active {
		transform: translateY(0);
	}
	.go:disabled {
		opacity: 0.8;
		cursor: progress;
		transform: none;
	}
	.go svg {
		transition: transform 200ms var(--ease);
	}
	.go:hover svg {
		transform: translateX(3px);
	}
	@media (max-width: 460px) {
		.three {
			grid-template-columns: 1fr 1fr;
		}
		.three .field:first-child {
			grid-column: 1 / -1;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
	@keyframes open {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
</style>

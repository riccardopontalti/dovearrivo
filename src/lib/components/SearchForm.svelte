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
			<span class="summary-edit"><span class="edit-label">{t.whenAndFilters}</span></span>
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
		gap: 1rem;
	}
	.when {
		border: 1.5px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.when > summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 48px;
		padding: 0 0.85rem;
		cursor: pointer;
		list-style: none;
	}
	.when > summary::-webkit-details-marker {
		display: none;
	}
	.summary-value {
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 0.9rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.summary-edit {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.summary-edit::after {
		content: '+';
		display: inline-grid;
		place-items: center;
		width: 1.3rem;
		height: 1.3rem;
		border: 1.5px solid currentColor;
		border-radius: 50%;
		font-size: 0.9rem;
		line-height: 1;
		transition: transform 250ms var(--ease);
	}
	.when[open] .summary-edit::after {
		transform: rotate(45deg);
	}
	.when-body {
		display: grid;
		gap: 1rem;
		padding: 0.5rem 0.85rem 1rem;
		border-top: 1px solid var(--hair);
		animation: open 300ms var(--ease);
	}
	.days {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		min-height: 40px;
		min-width: 44px;
		padding: 0 0.9rem;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 150ms var(--ease),
			color 150ms var(--ease);
	}
	.chip:hover {
		background: var(--surface-2);
	}
	.chip[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
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
		border: 0;
		border-top: 1px solid var(--hair);
		margin: 0;
		padding: 0.75rem 0 0;
	}
	legend {
		padding: 0 0.4rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.go {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-height: 60px;
		padding: 0 1.25rem;
		border: 1.5px solid #111;
		border-radius: var(--radius);
		background: var(--signal);
		color: #111;
		font: inherit;
		font-size: 1.35rem;
		font-weight: 800;
		font-stretch: 85%;
		letter-spacing: -0.01em;
		cursor: pointer;
		overflow: hidden;
		isolation: isolate;
		transition: color 250ms var(--ease);
	}
	/* Ink fills the button from the left on hover. */
	.go::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: #111;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 350ms var(--ease);
	}
	.go:hover {
		color: var(--signal);
	}
	.go:hover::before {
		transform: scaleX(1);
	}
	.go svg {
		width: 28px;
		height: 28px;
		transition: transform 300ms var(--ease);
	}
	.go:hover svg {
		transform: translateX(4px);
	}
	.go:disabled {
		cursor: progress;
	}
	@media (max-width: 460px) {
		.when > summary > svg {
			display: none;
		}
		.summary-value {
			font-size: 0.82rem;
		}
		/* The label stays for screen readers; the + says it on small screens. */
		.edit-label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
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
			transform: translateY(-6px);
		}
	}
</style>

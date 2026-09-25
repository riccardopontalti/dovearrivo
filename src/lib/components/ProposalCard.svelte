<script lang="ts">
	import type { Destination, Journey as JourneyType, Proposal } from '$lib/api/types';
	import { clock, duration } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import CategoryIcon from './CategoryIcon.svelte';
	import DayRibbon from './DayRibbon.svelte';
	import Journey from './Journey.svelte';

	let {
		proposal,
		destination,
		t,
		date,
		start,
		end,
		selected = false,
		onselect
	}: {
		proposal: Proposal;
		destination?: Destination;
		t: Messages;
		date: string;
		start: string;
		end: string;
		selected?: boolean;
		onselect?: () => void;
	} = $props();

	const category = $derived(destination?.category ?? 'test');
	const categoryLabel = $derived((t as Record<string, string>)[`cat_${category}`] ?? '');

	function summary(j: JourneyType): string {
		const parts = [
			duration(j.durationSeconds, t),
			j.transfers === 0 ? t.direct : j.transfers === 1 ? t.oneTransfer : fill(t.manyTransfers, { n: j.transfers })
		];
		if (j.walkingBudgetSeconds > 0) parts.push(fill(t.onFoot, { d: duration(j.walkingBudgetSeconds, t) }));
		return parts.join(' · ');
	}
</script>

<article aria-labelledby="dest-{proposal.destinationId}" class:selected data-category={category}>
	<header>
		<span class="badge"><CategoryIcon {category} /></span>
		<div class="title">
			{#if categoryLabel}<p class="kind">{categoryLabel}</p>{/if}
			<h3 id="dest-{proposal.destinationId}">{destination?.name ?? proposal.destinationId}</h3>
		</div>
		<p class="stay"><span>{t.stay}</span> <strong>{duration(proposal.staySeconds, t)}</strong></p>
	</header>

	<DayRibbon {proposal} {date} {start} {end} {t} />

	<dl class="legs">
		<div class="out">
			<dt>{t.outbound}</dt>
			<dd>
				<strong class="times">{clock(proposal.outbound.startTime)} → {clock(proposal.outbound.endTime)}</strong>
				<span>{summary(proposal.outbound)}</span>
			</dd>
		</div>
		<div class="back">
			<dt>{t.inbound}</dt>
			<dd>
				<strong class="times">{clock(proposal.inbound.startTime)} → {clock(proposal.inbound.endTime)}</strong>
				<span>{summary(proposal.inbound)}</span>
			</dd>
		</div>
	</dl>

	<p class="backup" class:none={!proposal.backupInbound}>
		{#if proposal.backupInbound}
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
				><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg
			>
			{fill(t.backupReturn, { time: clock(proposal.backupInbound.startTime) })}
		{:else}
			{t.noLaterReturn}
		{/if}
	</p>

	<div class="actions">
		{#if onselect}
			<button type="button" class="map-button" aria-pressed={selected} onclick={onselect}>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
					><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" /></svg
				>
				{t.showOnMap}
			</button>
		{/if}
		<details>
			<summary>{t.details}</summary>
			<h4>{t.outbound}</h4>
			<Journey journey={proposal.outbound} {t} />
			<h4>{t.inbound}</h4>
			<Journey journey={proposal.inbound} {t} direction="back" />
			{#if destination}
				<p><a href={destination.infoUrl} rel="external noopener">{t.infoLink}</a></p>
			{/if}
		</details>
	</div>
</article>

<style>
	article {
		position: relative;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem 1.1rem 0.6rem;
		box-shadow: var(--shadow);
		transition:
			border-color 200ms var(--ease),
			box-shadow 200ms var(--ease),
			transform 200ms var(--ease);
	}
	article.selected {
		border-color: var(--accent);
		box-shadow:
			0 0 0 1px var(--accent),
			var(--shadow);
	}
	header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
	}
	.badge {
		display: grid;
		place-items: center;
		width: 2.9rem;
		height: 2.9rem;
		border-radius: 14px;
		color: var(--accent);
		background: linear-gradient(145deg, var(--accent-soft), color-mix(in srgb, var(--accent-soft) 40%, var(--surface)));
	}
	[data-category='lake'] .badge,
	[data-category='viewpoint'] .badge {
		color: #1b6fa8;
		background: linear-gradient(145deg, #e1eef8, #f1f6fb);
	}
	[data-category='town'] .badge,
	[data-category='castle'] .badge,
	[data-category='museum'] .badge {
		color: var(--back);
		background: linear-gradient(145deg, #fde6d8, #fdf2ea);
	}
	@media (prefers-color-scheme: dark) {
		[data-category='lake'] .badge,
		[data-category='viewpoint'] .badge {
			color: #8cc4ef;
			background: linear-gradient(145deg, #173652, #13223a);
		}
		[data-category='town'] .badge,
		[data-category='castle'] .badge,
		[data-category='museum'] .badge {
			background: linear-gradient(145deg, #4a2b20, #13223a);
		}
	}
	.title {
		min-width: 0;
	}
	.kind {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
	h3 {
		margin: 0;
		font-size: 1.25rem;
		overflow-wrap: anywhere;
	}
	.stay {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.78rem;
		color: var(--muted);
		line-height: 1.2;
	}
	.stay strong {
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.legs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin: 0.25rem 0 0.75rem;
	}
	.legs > div {
		padding-left: 0.65rem;
		border-left: 3px solid var(--out);
	}
	.legs .back {
		border-left-color: var(--back);
	}
	dt {
		color: var(--muted);
		font-size: 0.8rem;
	}
	dd {
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.times {
		font-variant-numeric: tabular-nums;
		font-size: 1.05rem;
	}
	dd span {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.backup {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0 0 0.35rem;
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		background: var(--accent-soft);
		font-size: 0.92rem;
	}
	.backup svg {
		flex: none;
		color: var(--accent);
	}
	.backup.none {
		background: var(--notice);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0 0.75rem;
	}
	.actions details {
		flex: 1 1 100%;
		order: 2;
	}
	.map-button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 44px;
		padding: 0 0.9rem;
		margin: 0.2rem 0;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--accent);
		font: inherit;
		font-weight: 600;
		font-size: 0.92rem;
		cursor: pointer;
	}
	.map-button[aria-pressed='true'] {
		background: var(--accent-soft);
		border-color: var(--accent);
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		display: flex;
		align-items: center;
		color: var(--accent);
		font-weight: 600;
		font-size: 0.92rem;
	}
	h4 {
		margin: 0.5rem 0 0.25rem;
		font-size: 0.9rem;
	}
	@media (max-width: 420px) {
		.legs {
			grid-template-columns: 1fr;
		}
	}
</style>

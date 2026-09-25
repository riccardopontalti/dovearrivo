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
	<div class="stub">
		<span class="icon"><CategoryIcon {category} size={30} /></span>
		{#if categoryLabel}<p class="kind">{categoryLabel}</p>{/if}
		<p class="stub-time"><span>{t.colTime}</span><strong>{clock(proposal.outbound.startTime)}</strong></p>
		<p class="stub-time"><span>{t.colLeave}</span><strong>{clock(proposal.inbound.startTime)}</strong></p>
	</div>

	<div class="main">
		<header>
			<h3 id="dest-{proposal.destinationId}">{destination?.name ?? proposal.destinationId}</h3>
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

		{#if proposal.backupInbound}
			<p class="stamp">
				<span class="stamp-top">{t.backup}</span>
				{fill(t.backupReturn, { time: clock(proposal.backupInbound.startTime) })}
			</p>
		{:else}
			<p class="nobackup">{t.noLaterReturn}</p>
		{/if}

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
	</div>
</article>

<style>
	article {
		--stub: 7.5rem;
		position: relative;
		display: grid;
		grid-template-columns: var(--stub) 1fr;
		background: var(--surface);
		border: 1.5px solid var(--rule);
		border-radius: 10px;
		overflow: hidden;
		transition:
			box-shadow 250ms var(--ease),
			transform 250ms var(--ease);
	}
	article:hover,
	article.selected {
		transform: translate(-3px, -3px);
		box-shadow: 6px 6px 0 var(--ink);
	}
	/* Perforation with a notch at each end. */
	article::before,
	article::after {
		content: '';
		position: absolute;
		left: calc(var(--stub) - 11px);
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--paper);
		border: 1.5px solid var(--rule);
		z-index: 2;
	}
	article::before {
		top: -12px;
	}
	article::after {
		bottom: -12px;
	}
	.stub {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1rem 0.9rem;
		background: var(--signal);
		color: #111;
		border-right: 2px dashed #111;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: 1.5px solid #111;
		border-radius: 50%;
		background: #fff8d6;
	}
	.kind {
		margin: 0.2rem 0 0.4rem;
		font-family: var(--font-mono);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.stub-time {
		display: flex;
		flex-direction: column;
		margin: 0;
		line-height: 1.1;
	}
	.stub-time span {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.stub-time strong {
		font-family: var(--font-mono);
		font-size: 1.35rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
	}
	.main {
		min-width: 0;
		padding: 1rem 1.1rem 0.5rem 1.4rem;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: start;
	}
	h3 {
		margin: 0;
		font-size: clamp(1.4rem, 2.4vw, 1.75rem);
		font-stretch: 80%;
		overflow-wrap: anywhere;
	}
	.stay {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1.1;
	}
	.stay span {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.stay strong {
		font-family: var(--font-mono);
		font-size: 1.15rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.legs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin: 0.25rem 0 0.9rem;
	}
	.legs > div {
		padding-left: 0.65rem;
		border-left: 3px solid var(--out);
	}
	.legs .back {
		border-left: 6px solid var(--back);
		box-shadow: -1.5px 0 0 var(--back-edge);
	}
	dt {
		font-family: var(--font-mono);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}
	dd {
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	.times {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: 1rem;
	}
	dd span {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.stamp {
		display: inline-flex;
		flex-direction: column;
		margin: 0 0 0.5rem;
		padding: 0.35rem 0.8rem;
		border: 2.5px double var(--ink);
		border-radius: 6px;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 600;
		transform: rotate(-2.5deg);
		animation: stamp 450ms 650ms cubic-bezier(0.3, 1.6, 0.5, 1) backwards;
	}
	.stamp-top {
		font-size: 0.65rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	@keyframes stamp {
		from {
			opacity: 0;
			transform: scale(1.8) rotate(-12deg);
		}
	}
	.nobackup {
		margin: 0 0 0.5rem;
		padding: 0.4rem 0.7rem;
		border-left: 3px solid var(--muted);
		font-size: 0.9rem;
		color: var(--muted);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0 0.75rem;
		border-top: 1px solid var(--hair);
		padding-top: 0.25rem;
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
		margin: 0.35rem 0 0.1rem;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-weight: 650;
		font-size: 0.92rem;
		cursor: pointer;
	}
	.map-button:hover {
		background: var(--surface-2);
	}
	.map-button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		display: flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	h4 {
		margin: 0.5rem 0 0.25rem;
		font-size: 0.95rem;
	}
	@media (max-width: 520px) {
		article {
			--stub: 0px;
			grid-template-columns: 1fr;
		}
		article::before,
		article::after {
			display: none;
		}
		.stub {
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.4rem 1rem;
			padding: 0.6rem 1rem;
			border-right: 0;
			border-bottom: 2px dashed #111;
		}
		.icon {
			width: 2.4rem;
			height: 2.4rem;
		}
		.kind {
			margin: 0;
			flex: 1;
		}
		.main {
			padding: 0.9rem 1rem 0.5rem;
		}
		.legs {
			grid-template-columns: 1fr;
		}
	}
</style>

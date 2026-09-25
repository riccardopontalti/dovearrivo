<script lang="ts">
	import type { Destination, Journey as JourneyType, Proposal } from '$lib/api/types';
	import { clock, duration } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import Journey from './Journey.svelte';

	let { proposal, destination, t }: { proposal: Proposal; destination?: Destination; t: Messages } = $props();

	function summary(j: JourneyType): string {
		const parts = [
			duration(j.durationSeconds, t),
			j.transfers === 0 ? t.direct : j.transfers === 1 ? t.oneTransfer : fill(t.manyTransfers, { n: j.transfers })
		];
		if (j.walkingBudgetSeconds > 0) parts.push(fill(t.onFoot, { d: duration(j.walkingBudgetSeconds, t) }));
		return parts.join(' · ');
	}
</script>

<article aria-labelledby="dest-{proposal.destinationId}">
	<header>
		<h3 id="dest-{proposal.destinationId}">{destination?.name ?? proposal.destinationId}</h3>
		<p class="stay"><span>{t.stay}</span> <strong>{duration(proposal.staySeconds, t)}</strong></p>
	</header>

	<dl class="legs">
		<div>
			<dt>{t.outbound}</dt>
			<dd>
				<strong class="times">{clock(proposal.outbound.startTime)} → {clock(proposal.outbound.endTime)}</strong>
				<span>{summary(proposal.outbound)}</span>
			</dd>
		</div>
		<div>
			<dt>{t.inbound}</dt>
			<dd>
				<strong class="times">{clock(proposal.inbound.startTime)} → {clock(proposal.inbound.endTime)}</strong>
				<span>{summary(proposal.inbound)}</span>
			</dd>
		</div>
	</dl>

	<p class="backup" class:none={!proposal.backupInbound}>
		{#if proposal.backupInbound}
			{fill(t.backupReturn, { time: clock(proposal.backupInbound.startTime) })}
		{:else}
			{t.noLaterReturn}
		{/if}
	</p>

	<details>
		<summary>{t.details}</summary>
		<h4>{t.outbound}</h4>
		<Journey journey={proposal.outbound} {t} />
		<h4>{t.inbound}</h4>
		<Journey journey={proposal.inbound} {t} />
		{#if destination}
			<p><a href={destination.infoUrl} rel="external noopener">{t.infoLink}</a></p>
		{/if}
	</details>
</article>

<style>
	article {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 14px;
		padding: 1rem 1.1rem;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h3 {
		margin: 0;
		font-size: 1.2rem;
	}
	.stay {
		margin: 0;
		color: var(--muted);
	}
	.stay strong {
		color: var(--text);
		font-size: 1.1rem;
	}
	.legs {
		display: grid;
		gap: 0.5rem;
		margin: 0.75rem 0;
	}
	.legs div {
		display: grid;
		grid-template-columns: 5.5rem 1fr;
		gap: 0.5rem;
	}
	dt {
		color: var(--muted);
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
		font-size: 0.92rem;
	}
	.backup {
		margin: 0 0 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		background: var(--accent-soft);
	}
	.backup.none {
		background: var(--notice);
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		display: flex;
		align-items: center;
		color: var(--accent);
	}
	h4 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.95rem;
	}
</style>

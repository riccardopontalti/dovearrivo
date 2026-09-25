<script lang="ts">
	import type { Journey } from '$lib/api/types';
	import { clock, duration, modeLabel } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';

	let { journey, t }: { journey: Journey; t: Messages } = $props();
</script>

<ol class="legs">
	{#each journey.legs as leg, i (i)}
		<li class:walk={leg.mode === 'WALK'}>
			<span class="time">{clock(leg.startTime)}</span>
			{#if leg.mode === 'WALK'}
				<span>{fill(t.onFoot, { d: duration(leg.durationSeconds, t) })} → {leg.to.name}</span>
			{:else}
				<span>
					<strong>{modeLabel(leg.mode, t)}{leg.routeName ? ` ${leg.routeName}` : ''}</strong>
					{#if leg.headsign}<span class="muted">{fill(t.towards, { h: leg.headsign })}</span>{/if}
					<br />{leg.from.name} → {leg.to.name}
					<span class="muted">({clock(leg.startTime)}–{clock(leg.endTime)})</span>
				</span>
			{/if}
		</li>
	{/each}
</ol>

<style>
	.legs {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 3.25rem 1fr;
		gap: 0.5rem;
		padding: 0.35rem 0;
		border-left: 3px solid var(--accent);
		padding-left: 0.6rem;
	}
	li.walk {
		border-left-style: dotted;
		color: var(--muted);
	}
	.time {
		font-variant-numeric: tabular-nums;
	}
	.muted {
		color: var(--muted);
	}
</style>

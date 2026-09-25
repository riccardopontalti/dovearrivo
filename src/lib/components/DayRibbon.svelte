<script lang="ts">
	// The day at a glance: outbound, stay and return inside the user's window, with the
	// backup return as a ghost segment. The legs list in the card carries the same facts as
	// text; the ribbon has a short text label of its own.
	import type { Proposal } from '$lib/api/types';
	import { clock, duration } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import { clockLabel, ribbonOf } from '$lib/ribbon';

	let { proposal, date, start, end, t }: { proposal: Proposal; date: string; start: string; end: string; t: Messages } = $props();

	const ribbon = $derived(ribbonOf(proposal, date, start, end));
	const label = $derived(
		fill(t.ribbonLabel, {
			out: `${clock(proposal.outbound.startTime)}–${clock(proposal.outbound.endTime)}`,
			stay: duration(proposal.staySeconds, t),
			back: `${clock(proposal.inbound.startTime)}–${clock(proposal.inbound.endTime)}`
		}) + (proposal.backupInbound ? ` ${fill(t.ribbonBackup, { time: clock(proposal.backupInbound.startTime) })}` : '')
	);
	const byKind = $derived(Object.fromEntries(ribbon.segments.map((s) => [s.kind, s])));
</script>

<div class="ribbon" role="img" aria-label={label} data-testid="day-ribbon">
	<div class="track">
		<span class="window" style="left:{ribbon.windowStart}%;width:{ribbon.windowEnd - ribbon.windowStart}%"></span>
		{#each ribbon.segments as s, i (s.kind)}
			<span class="seg {s.kind}" style="left:{s.left}%;width:{s.width}%;--i:{i}"></span>
		{/each}
		<span class="deadline" style="left:{ribbon.windowEnd}%"></span>
	</div>
	<div class="marks" aria-hidden="true">
		<span class="mark out" style="left:{byKind.outbound.left}%">{clockLabel(byKind.outbound.start)}</span>
		{#if byKind.stay.width > 24}
			<span class="mark mid" style="left:{byKind.stay.left + byKind.stay.width / 2}%">{duration(proposal.staySeconds, t)}</span>
		{/if}
		<span class="mark back" style="left:{byKind.inbound.left + byKind.inbound.width}%">{clockLabel(byKind.inbound.end)}</span>
	</div>
	<div class="ticks" aria-hidden="true">
		{#each ribbon.ticks as tick (tick.minutes)}
			<span style="left:{tick.at}%">{clockLabel(tick.minutes).replace(':00', '')}</span>
		{/each}
		<span class="backby" style="left:{ribbon.windowEnd}%">{fill(t.ribbonBackBy, { time: end })}</span>
	</div>
</div>

<style>
	.ribbon {
		position: relative;
		margin: 0.85rem 0 0.4rem;
		padding-top: 1.35rem;
	}
	.track {
		position: relative;
		height: 12px;
		border-radius: 999px;
		background: var(--surface-2);
	}
	.window {
		position: absolute;
		top: -4px;
		bottom: -4px;
		border-radius: 999px;
		border: 1px dashed color-mix(in srgb, var(--muted) 55%, transparent);
	}
	.seg {
		position: absolute;
		top: 0;
		bottom: 0;
		border-radius: 999px;
		transform-origin: left center;
		animation: grow 420ms calc(var(--i) * 110ms + 80ms) var(--ease) both;
	}
	.outbound {
		background: var(--out);
		z-index: 2;
	}
	.stay {
		background: repeating-linear-gradient(135deg, var(--stay) 0 5px, color-mix(in srgb, var(--stay) 60%, transparent) 5px 10px);
		top: 3px;
		bottom: 3px;
	}
	.inbound {
		background: var(--back);
		z-index: 2;
	}
	.backup {
		background: transparent;
		border: 2px dashed var(--back);
		top: -3px;
		bottom: -3px;
		opacity: 0.85;
	}
	.deadline {
		position: absolute;
		top: -9px;
		bottom: -9px;
		width: 2px;
		margin-left: -1px;
		background: var(--text);
		border-radius: 2px;
	}
	.marks,
	.ticks {
		position: relative;
		height: 1.1rem;
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	.marks {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}
	.mark {
		position: absolute;
		white-space: nowrap;
		font-weight: 650;
		font-size: 0.78rem;
	}
	.mark.out {
		color: var(--out);
	}
	.mark.back {
		color: var(--back);
		transform: translateX(-100%);
	}
	.mark.mid {
		color: var(--muted);
		transform: translateX(-50%);
		font-weight: 500;
	}
	.ticks {
		margin-top: 0.35rem;
		color: var(--muted);
	}
	.ticks span {
		position: absolute;
		transform: translateX(-50%);
	}
	.ticks span:first-child {
		transform: none;
	}
	.ticks .backby {
		top: 1.05rem;
		transform: translateX(-100%);
		white-space: nowrap;
		font-weight: 600;
		color: var(--text);
	}
	.ribbon {
		margin-bottom: 1.4rem;
	}
	@keyframes grow {
		from {
			transform: scaleX(0);
			opacity: 0;
		}
	}
</style>

<script lang="ts">
	// Home page departures board: real trips with a way back from Trento in the next hours
	// (/board). Times are split flaps; each destination is one wide blade, as on Solari
	// boards, with the place on the upper half and the spot on the lower one, so names are
	// never cut. Each row opens the full search for that trip. The flaps are visual: every
	// row carries its content as text for assistive technology.
	import { onMount } from 'svelte';
	import { splitName } from '$lib/flap';
	import { clock } from '$lib/format';
	import { fill, type Messages } from '$lib/i18n';
	import { toParams } from '$lib/search-form';
	import BlankFlaps from './flap/BlankFlaps.svelte';
	import FlapBlade from './flap/FlapBlade.svelte';
	import FlapText from './flap/FlapText.svelte';

	interface Row {
		id: string;
		name: string;
		category: string;
		depart: string;
		arrive: string;
		leave: string;
		home: string;
		backup?: string;
	}
	interface BoardData {
		origin: { name: string; from: string };
		date: string;
		start: string;
		end: string;
		partial: boolean;
		rows: Row[];
		limits: { maxJourneyMinutes: number; minStayMinutes: number; maxWalkMinutes: number; maxTransfers: number };
	}

	let { t, locale }: { t: Messages; locale: 'it' | 'en' } = $props();

	const ROWS = 7;
	let el: HTMLElement;
	let board = $state<BoardData | null>(null);
	let status = $state<'loading' | 'ready' | 'unavailable'>('loading');
	let still = $state(false);
	// The flaps spin when the board comes into view, not while the page loads.
	let live = $state(false);
	// Flaps exist only in the browser; the server sends the empty board.
	let mounted = $state(false);
	let now = $state('');
	let size = $state({ mode: 'wide' as 'wide' | 'medium' | 'narrow', cell: 26, title: 20 });

	const slots = $derived(Array.from({ length: ROWS }, (_, i) => (live ? (board?.rows[i] ?? null) : null)));
	const isTomorrow = $derived(!!board && board.date > new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date()));
	const title = $derived(
		`${fill(size.mode === 'narrow' ? t.boardTitleShort : t.boardTitle, { origin: board?.origin.name ?? 'Trento' })}${isTomorrow ? ` · ${t.boardTomorrow}` : ''}`
	);
	const message = $derived(
		status === 'loading' ? t.boardLoading : status === 'unavailable' ? t.boardUnavailable : board && board.rows.length === 0 ? t.boardEmpty : ''
	);
	// Before the board is in view it shows the loading line, still.
	const visualMessage = $derived(live ? message : t.boardLoading);

	const kind = (c: string) => (t as Record<string, string>)[`kind_${c}`] ?? '';
	function face(row: Row) {
		const { title, sub } = splitName(row.name);
		return { title, sub: sub || kind(row.category) };
	}
	const pool = $derived(board?.rows.map(face) ?? []);

	function href(row: Row): string {
		if (!board) return '/';
		const form = { from: board.origin.from, fromQuery: board.origin.name, date: board.date, start: board.start, end: board.end, ...board.limits };
		return `/?${toParams(form, locale)}#card-${row.id}`;
	}

	function label(row: Row): string {
		const text = fill(t.boardRowLabel, row as unknown as Record<string, string>);
		return row.backup ? `${text} ${fill(t.boardRowBackup, { time: row.backup })}` : text;
	}

	function measure() {
		const w = el.clientWidth - 2 * (el.clientWidth < 560 ? 14 : 26);
		if (w >= 860) {
			// Leaves · destination · arrives · return · backup
			const cell = Math.max(20, Math.min(30, Math.floor(w / 46) - 2));
			size = { mode: 'wide', cell, title: Math.floor(w / (cell + 2)) - 7 };
		} else if (w >= 520) {
			// Leaves · destination · return
			const cell = Math.max(18, Math.min(26, Math.floor(w / 30) - 2));
			size = { mode: 'medium', cell, title: Math.floor(w / (cell + 2)) - 7 };
		} else {
			// Destination on its own line, times below.
			const cell = 18;
			size = { mode: 'narrow', cell, title: Math.floor(w / (cell + 2)) - 6 };
		}
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		measure();
		mounted = true;
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		const seen = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					live = true;
					seen.disconnect();
				}
			},
			{ threshold: 0.2 }
		);
		seen.observe(el);

		const tick = () => (now = clock(new Date().toISOString()));
		tick();
		const minute = setInterval(tick, 15_000);

		fetch(`/board?lang=${locale}`)
			.then((r) => r.json())
			.then((body: BoardData | { unavailable: true }) => {
				if ('unavailable' in body) status = 'unavailable';
				else {
					board = body;
					status = 'ready';
				}
			})
			.catch(() => (status = 'unavailable'));

		return () => {
			observer.disconnect();
			seen.disconnect();
			clearInterval(minute);
		};
	});
</script>

<section
	class="board {size.mode}"
	aria-labelledby="board-title"
	aria-busy={status === 'loading'}
	bind:this={el}
	style="--cell-w:{size.cell}px;--cell-h:{Math.round(size.cell * 1.5)}px;--fs:{Math.round(size.cell * 1.18)}px;--blade-h:{size.mode === 'narrow' ? 54 : Math.max(58, Math.round(size.cell * 2.5))}px"
>
	<header class="head">
		<h2 id="board-title">
			<span class="visually-hidden">{title}</span>
			{#if mounted}<FlapText text={title} length={size.title} still />{:else}<BlankFlaps length={size.title} />{/if}
		</h2>
		<p class="clock">
			<span class="visually-hidden">{t.boardClock} {now}</span>
			{#if mounted}<FlapText text={live ? now : ''} length={5} stagger={60} {still} />{:else}<BlankFlaps length={5} />{/if}
		</p>
	</header>

	{#if size.mode !== 'narrow'}
		<div class="cols" aria-hidden="true">
			<span class="c-time">{t.colTime}</span>
			<span class="c-dest">{t.colDest}</span>
			{#if size.mode === 'wide'}<span class="c-time">{t.colArrive}</span>{/if}
			<span class="c-time">{t.colLeave}</span>
			{#if size.mode === 'wide'}<span class="c-time">{t.colBackup}</span>{/if}
		</div>
	{/if}

	<ol class="rows">
		{#each slots as row, i (row?.id ?? `empty-${i}`)}
			<li>
				{#if row}
					{@const f = face(row)}
					<a class="row" href={href(row)} data-sveltekit-preload-data="off">
						<span class="visually-hidden">{label(row)}</span>
						{#if size.mode === 'narrow'}
							<FlapBlade title={f.title} sub={f.sub} {pool} delay={i * 140} {still} />
							<span class="sub" aria-hidden="true">
								<span class="tag">{t.colTime}</span>
								<span class="time"><FlapText text={row.depart} length={5} delay={i * 140 + 300} {still} /></span>
								<span class="tag">{t.colLeave}</span>
								<span class="time"><FlapText text={row.leave} length={5} delay={i * 140 + 420} {still} /></span>
							</span>
						{:else}
							<span class="time"><FlapText text={row.depart} length={5} delay={i * 140} {still} /></span>
							<FlapBlade title={f.title} sub={f.sub} {pool} delay={i * 140 + 120} {still} />
							{#if size.mode === 'wide'}
								<span class="time"><FlapText text={row.arrive} length={5} delay={i * 140 + 260} {still} /></span>
							{/if}
							<span class="time"><FlapText text={row.leave} length={5} delay={i * 140 + 340} {still} /></span>
							{#if size.mode === 'wide'}
								<span class="time"><FlapText text={row.backup ?? '-'} length={5} delay={i * 140 + 420} {still} /></span>
							{/if}
						{/if}
						<span class="go" aria-hidden="true">→</span>
					</a>
				{:else}
					<div class="row blank" aria-hidden="true">
						{#if size.mode === 'narrow'}
							{#if mounted && i === 0 && visualMessage}
								<FlapBlade title={visualMessage} sub="" still={still || !live} />
							{:else}
								<span class="blank-blade"></span>
							{/if}
						{:else}
							<BlankFlaps length={5} />
							{#if mounted && i === 0 && visualMessage}
								<FlapBlade title={visualMessage} sub="" still={still || !live} />
							{:else}
								<span class="blank-blade"></span>
							{/if}
							{#if size.mode === 'wide'}<BlankFlaps length={5} />{/if}
							<BlankFlaps length={5} />
							{#if size.mode === 'wide'}<BlankFlaps length={5} />{/if}
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
	{#if message}<p class="visually-hidden" role="status">{message}</p>{/if}
</section>

{#if board}
	<p class="note">
		{fill(t.boardNote, { start: board.start, end: board.end, stay: `${board.limits.minStayMinutes} min`, journey: `${board.limits.maxJourneyMinutes} min` })}
		{#if board.partial}{t.partialHelp}{/if}
		<strong>{t.boardHint}</strong>
	</p>
{/if}

<style>
	.board {
		--time-w: calc(5 * (var(--cell-w) + 2px) - 2px);
		position: relative;
		background: var(--board);
		color: var(--flap-ink);
		padding: 20px 26px 24px;
		border-radius: 10px;
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.06),
			0 30px 60px -30px rgb(0 0 0 / 0.6);
		font-family: var(--font-sans);
		font-size: var(--fs);
		font-weight: 750;
		font-stretch: 68%;
		overflow: hidden;
	}
	.board.narrow {
		padding: 14px 14px 16px;
	}
	/* Screws in the corners, like a real board. */
	.board::before {
		content: '';
		position: absolute;
		inset: 8px;
		pointer-events: none;
		background:
			radial-gradient(circle at 0 0, #3a3a3a 2.5px, transparent 3px) top left / 12px 12px no-repeat,
			radial-gradient(circle at 100% 0, #3a3a3a 2.5px, transparent 3px) top right / 12px 12px no-repeat,
			radial-gradient(circle at 0 100%, #3a3a3a 2.5px, transparent 3px) bottom left / 12px 12px no-repeat,
			radial-gradient(circle at 100% 100%, #3a3a3a 2.5px, transparent 3px) bottom right / 12px 12px no-repeat;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 14px;
	}
	.head h2 {
		margin: 0;
		font: inherit;
		letter-spacing: 0;
	}
	.clock {
		margin: 0;
		color: var(--signal);
	}
	.cols {
		display: flex;
		gap: var(--cell-w);
		margin: 0 0 8px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #8a8780;
	}
	.c-time {
		width: var(--time-w);
		flex: none;
	}
	.c-dest {
		flex: 1;
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.row {
		position: relative;
		display: flex;
		gap: var(--cell-w);
		align-items: center;
		color: inherit;
		text-decoration: none;
		border-radius: 4px;
		outline-offset: 4px;
	}
	.row > .time,
	.row > :global(.flaps),
	.row > :global(.blank) {
		flex: none;
	}
	.blank-blade {
		flex: 1;
		height: var(--blade-h);
		border-radius: 4px;
		background:
			linear-gradient(transparent calc(50% - 0.5px), rgb(0 0 0 / 0.9) calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
			var(--flap);
	}
	.narrow .row {
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
		padding-bottom: 10px;
		border-bottom: 1px solid #262626;
	}
	.narrow .row > :global(.blade),
	.narrow .blank-blade {
		flex: none;
	}
	.narrow li:last-child .row {
		border-bottom: 0;
	}
	.time {
		color: var(--signal);
	}
	.sub {
		display: flex;
		align-items: center;
		gap: 8px;
		--cell-w: 15px;
		--cell-h: 22px;
		font-size: 18px;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #8a8780;
	}
	.go {
		position: absolute;
		right: -20px;
		top: 50%;
		transform: translate(-6px, -50%);
		opacity: 0;
		color: var(--signal);
		font-size: 0.9em;
		transition:
			opacity 200ms var(--ease),
			transform 200ms var(--ease);
	}
	.row:hover .go,
	.row:focus-visible .go {
		opacity: 1;
		transform: translate(0, -50%);
	}
	.row:hover :global(.half) {
		background: #282828;
	}
	.row:focus-visible {
		outline: 3px solid var(--signal);
	}
	.narrow .go {
		right: 6px;
		top: 26px;
	}
	.note {
		margin: 0.9rem 0 0;
		max-width: 60rem;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--muted);
	}
	.note strong {
		color: var(--ink);
		font-weight: 600;
	}
</style>

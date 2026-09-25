<script lang="ts">
	// Accessible combobox (WAI-ARIA 1.2 list autocomplete). Without JavaScript the text field
	// is submitted as `fromQuery` and the server resolves it.
	import type { PlaceMatch } from '$lib/api/types';
	import { placeLabel } from '$lib/format';
	import type { Messages } from '$lib/i18n';
	import { coordinateFrom } from '$lib/search-form';

	let { t, from = $bindable(''), query = $bindable('') }: { t: Messages; from?: string; query?: string } = $props();

	let stops = $state<PlaceMatch[]>([]);
	let open = $state(false);
	let loading = $state(false);
	let active = $state(-1);
	let controller: AbortController | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const listId = 'from-stops';
	const optionId = (i: number) => `from-stop-${i}`;

	function search(text: string) {
		clearTimeout(timer);
		controller?.abort();
		if (text.trim().length < 2) {
			stops = [];
			open = false;
			return;
		}
		timer = setTimeout(async () => {
			controller = new AbortController();
			loading = true;
			open = true;
			try {
				const r = await fetch(`/api/v1/places?q=${encodeURIComponent(text.trim())}`, { signal: controller.signal });
				stops = r.ok ? ((await r.json()) as PlaceMatch[]) : [];
				active = -1;
			} catch {
				// superseded by a newer query
			} finally {
				loading = false;
			}
		}, 200);
	}

	function oninput(event: Event) {
		query = (event.currentTarget as HTMLInputElement).value;
		from = '';
		search(query);
	}

	function choose(place: PlaceMatch) {
		from = place.stopId ?? coordinateFrom(place.point);
		query = place.name;
		open = false;
		active = -1;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' && stops.length) {
			event.preventDefault();
			open = true;
			active = (active + 1) % stops.length;
		} else if (event.key === 'ArrowUp' && stops.length) {
			event.preventDefault();
			active = active <= 0 ? stops.length - 1 : active - 1;
		} else if (event.key === 'Enter' && open && active >= 0) {
			event.preventDefault();
			choose(stops[active]);
		} else if (event.key === 'Escape') {
			open = false;
			active = -1;
		}
	}
</script>

<div class="picker">
	<label for="fromQuery">{t.from}</label>
	<input
		id="fromQuery"
		name="fromQuery"
		type="text"
		role="combobox"
		autocomplete="off"
		spellcheck="false"
		required
		minlength="2"
		maxlength="80"
		placeholder={t.fromPlaceholder}
		aria-autocomplete="list"
		aria-expanded={open}
		aria-controls={listId}
		aria-activedescendant={active >= 0 ? optionId(active) : undefined}
		aria-describedby="fromHelp"
		value={query}
		{oninput}
		{onkeydown}
		onblur={() => setTimeout(() => (open = false), 150)}
	/>
	<input type="hidden" name="from" value={from} />
	<p id="fromHelp" class="help">{t.fromHelp}</p>

	<ul id={listId} role="listbox" aria-label={t.from} hidden={!open}>
		{#if loading && stops.length === 0}
			<li class="info" role="presentation">{t.stopsLoading}</li>
		{:else if stops.length === 0}
			<li class="info" role="presentation">{t.noStops}</li>
		{/if}
		{#each stops as stop, i (`${stop.kind}:${stop.stopId ?? coordinateFrom(stop.point)}`)}
			<li
				id={optionId(i)}
				role="option"
				aria-selected={i === active}
				onpointerdown={(e) => {
					e.preventDefault();
					choose(stop);
				}}
			>
				<span>{stop.name}{#if stop.area && stop.kind !== 'stop'}<span class="feed">, {stop.area}</span>{/if}</span>
				<span class="feed">{placeLabel(stop, t)}</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.picker {
		position: relative;
	}
	ul {
		position: absolute;
		z-index: 10;
		left: 0;
		right: 0;
		margin: 0.25rem 0 0;
		padding: 0.25rem;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
		max-height: 18rem;
		overflow-y: auto;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		min-height: 44px;
		align-items: center;
		padding: 0.25rem 0.75rem;
		border-radius: 8px;
		cursor: pointer;
	}
	li[aria-selected='true'],
	li[role='option']:hover {
		background: var(--accent-soft);
	}
	.info {
		color: var(--muted);
		cursor: default;
	}
	.feed {
		color: var(--muted);
		font-size: 0.85rem;
		white-space: nowrap;
	}
</style>

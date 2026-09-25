<script lang="ts">
	// Line illustrations drawn for DoveArrivo, one per catalogue category (24×24, stroke).
	let { category, size = 28 }: { category: string; size?: number } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#if category === 'lake'}
		<path d="M3 13.5 8 7l3 3.5L14 6l7 7.5" />
		<path d="M3 17c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />
		<path d="M5 20.5c1.2 0 1.2-.8 2.4-.8s1.2.8 2.4.8" />
	{:else if category === 'town'}
		<path d="M3 20.5h18" />
		<path d="M5 20.5v-7l3.5-3 3.5 3v7" />
		<path d="M12 20.5V9l3-5 3 5v11.5" />
		<path d="M15 4V2.5M7.5 20.5v-3h2v3M14.5 12h1" />
	{:else if category === 'park'}
		<path d="M8 20.5v-5M16 20.5v-7" />
		<path d="M8 15.5c-2.6 0-4-1.7-4-3.8 0-2 1.6-3.4 3-3.6.4-2 2-3.6 4-3.6" />
		<path d="M16 13.5c2.8 0 4.5-2 4.5-4.4S18.7 4.5 16 4.5s-4.5 2.1-4.5 4.6 1.7 4.4 4.5 4.4Z" />
		<path d="M3 20.5h18" />
	{:else if category === 'castle'}
		<path d="M4 20.5V9h3V7h2v2h2V7h2v2h2V7h2v2h3v11.5" />
		<path d="M10 20.5v-4a2 2 0 0 1 4 0v4" />
		<path d="M12 7V3.5l3 1-3 1" />
		<path d="M3 20.5h18" />
	{:else if category === 'museum'}
		<path d="M3 9.5 12 4l9 5.5" />
		<path d="M4.5 9.5h15M5 20.5h14M3.5 20.5h17" />
		<path d="M7 12v6M12 12v6M17 12v6" />
	{:else if category === 'viewpoint'}
		<path d="M2.5 19.5 9 11l3.5 4L15 12l6.5 7.5" />
		<circle cx="17.5" cy="6" r="2.5" />
		<path d="M3 5.5c2-1.5 4-1.5 6 0" />
	{:else if category === 'nature'}
		<path d="M2.5 20 9.5 8l3.5 6 2.5-4 6 10Z" />
		<path d="M7.5 11.5 9.5 13l2-1.5" />
		<circle cx="18" cy="5" r="2" />
	{:else}
		<circle cx="12" cy="12" r="8.5" />
		<path d="m14.8 9.2-1.8 3.8-3.8 1.8 1.8-3.8Z" />
	{/if}
</svg>

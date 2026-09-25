<script lang="ts">
	// Brand mark: a "D" drawn as a transit-map route. The stem is where you start, the bowl
	// runs out to a stop (the ring at its far point) and comes back with an arrow: a day trip
	// with a way home. On hover of the brand link the route draws itself again.
	let { size = 36 }: { size?: number } = $props();
</script>

<svg class="logo" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true"><rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10" fill="#ffc700" stroke="#111" stroke-width="1.5" /><g transform="translate(1.8 0)"><path class="route" pathLength="100" d="M10.5 30V10H17a10 10 0 0 1 0 20h-1.8" fill="none" stroke="#111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /><path d="m18.2 27-3 3 3 3" fill="none" stroke="#111" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="27" cy="20" r="3.4" fill="#fffdf5" stroke="#111" stroke-width="2.4" /></g></svg>

<style>
	.logo {
		flex: none;
	}
	.route {
		stroke-dasharray: 100;
		stroke-dashoffset: 0;
	}
	:global(a:hover) > .logo .route,
	:global(a:focus-visible) > .logo .route {
		animation: route 900ms cubic-bezier(0.6, 0, 0.2, 1);
	}
	@keyframes route {
		from {
			stroke-dashoffset: 100;
		}
	}
</style>

<script lang="ts">
	// Brand mark: one split-flap card. The upper flap carries the way there (signal yellow),
	// the lower flap the way back: "andata e ritorno" on a departures board. On hover of the
	// brand link the upper flap turns once around the hinge.
	let { size = 34 }: { size?: number } = $props();
</script>

<svg class="logo" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
	<rect width="40" height="40" rx="8" fill="#111" />
	<g class="lower">
		<rect x="3" y="21" width="34" height="16" rx="3.5" fill="#262626" />
		<path d="M28.5 29H12.5m5-5-5 5 5 5" fill="none" stroke="#ede9df" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
	</g>
	<g class="upper">
		<rect x="3" y="3" width="34" height="16" rx="3.5" fill="#2e2e2e" />
		<path d="M11.5 11h16m-5-5 5 5-5 5" fill="none" stroke="#ffc700" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
	</g>
</svg>

<style>
	.logo {
		flex: none;
		overflow: visible;
		border-radius: 20%;
		box-shadow: 0 0 0 1.5px var(--rule);
	}
	.upper {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		transition: transform 650ms cubic-bezier(0.5, 0, 0.2, 1);
	}
	:global(a:hover) > .logo .upper,
	:global(a:focus-visible) > .logo .upper {
		transform: perspective(60px) rotateX(-360deg);
	}
</style>

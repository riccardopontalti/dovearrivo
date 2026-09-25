<script lang="ts">
	// A row of empty flaps drawn with one element (the board has hundreds of them).
	let { length }: { length: number } = $props();
</script>

<span class="blank" style="--n:{length}" aria-hidden="true"></span>

<style>
	.blank {
		display: inline-block;
		height: var(--cell-h, 2em);
		width: calc(var(--n) * (var(--cell-w, 1.4em) + var(--cell-gap, 2px)) - var(--cell-gap, 2px));
		background:
			linear-gradient(transparent calc(50% - 0.5px), rgb(0 0 0 / 0.85) calc(50% - 0.5px) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
			repeating-linear-gradient(90deg, var(--flap) 0 var(--cell-w, 1.4em), transparent var(--cell-w, 1.4em) calc(var(--cell-w, 1.4em) + var(--cell-gap, 2px)));
		border-radius: 3px;
	}
</style>

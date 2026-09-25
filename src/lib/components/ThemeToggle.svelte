<script lang="ts">
	// Light/dark switch. The new theme grows as a circle from the button where view
	// transitions exist; otherwise, and with reduced motion, it changes at once.
	import { onMount } from 'svelte';
	import type { Messages } from '$lib/i18n';
	import { effectiveTheme, storeTheme, type Theme } from '$lib/theme';

	let { t }: { t: Messages } = $props();
	let theme = $state<Theme>('light');
	onMount(() => (theme = effectiveTheme()));

	function toggle(event: MouseEvent) {
		const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
		const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
		const apply = () => {
			storeTheme(next);
			theme = next;
		};
		if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
		const root = document.documentElement;
		const x = event.clientX || innerWidth - 40;
		const y = event.clientY || 30;
		const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		root.classList.add('theme-switch');
		const transition = doc.startViewTransition(apply);
		transition.ready.then(() => {
			root.animate(
				{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
				{ duration: 650, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
			);
		});
		transition.finished.finally(() => root.classList.remove('theme-switch'));
	}
</script>

<button type="button" class="toggle" onclick={toggle} aria-label={theme === 'dark' ? t.themeLight : t.themeDark} title={theme === 'dark' ? t.themeLight : t.themeDark}>
	<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" class:dark={theme === 'dark'}>
		<mask id="theme-moon">
			<rect width="24" height="24" fill="#fff" />
			<circle class="bite" cx="24" cy="4" r="7" fill="#000" />
		</mask>
		<circle class="core" cx="12" cy="12" r="5.5" fill="currentColor" mask="url(#theme-moon)" />
		<g class="rays" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<path d="M12 1.5v2.2M12 20.3v2.2M1.5 12h2.2M20.3 12h2.2M4.6 4.6l1.5 1.5M17.9 17.9l1.5 1.5M4.6 19.4l1.5-1.5M17.9 6.1l1.5-1.5" />
		</g>
	</svg>
</button>

<style>
	.toggle {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 1.5px solid currentColor;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
		transition: background-color 150ms var(--ease);
	}
	.toggle:hover {
		background: var(--signal);
		color: #111;
		border-color: #111;
	}
	svg * {
		transition:
			transform 500ms var(--ease),
			opacity 300ms var(--ease);
		transform-origin: center;
		transform-box: fill-box;
	}
	.dark .core {
		transform: scale(1.45);
	}
	.dark .bite {
		transform: translate(-9px, 6px);
	}
	.dark .rays {
		opacity: 0;
		transform: rotate(-60deg) scale(0.6);
	}
</style>

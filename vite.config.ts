import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// Fonts stay files: the CSP allows fonts only from our origin, not data: URIs.
	build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// Everything is served by us: no third-party scripts, tiles, fonts or APIs.
			// SvelteKit adds hashes/nonces for its own inline scripts; MapLibre needs blob:
			// workers and images; inline style attributes are used by Svelte components.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self', 'blob:'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'pipeline/**/*.spec.ts'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.engine.spec.ts']
				}
			},
			{
				// Contract tests against a pinned MOTIS with synthetic fixtures (npm run test:engine).
				extends: './vite.config.ts',
				test: {
					name: 'engine',
					environment: 'node',
					include: ['src/**/*.engine.spec.ts']
				}
			}
		]
	}
});

import { defineConfig, devices } from '@playwright/test';

// End-to-end flows against a production build with the mock backend (synthetic data).
export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	webServer: {
		command: 'npm run build && node build',
		port: 4173,
		env: {
			PORT: '4173',
			ORIGIN: 'http://localhost:4173',
			DOVEARRIVO_BACKEND: 'mock',
			// No basemap: the tests cover the map-unavailable path deterministically.
			DOVEARRIVO_BASEMAP_DIR: 'tests/fixtures/no-basemap'
		},
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	use: { baseURL: 'http://localhost:4173' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	]
});

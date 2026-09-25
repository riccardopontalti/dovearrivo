import type { Page } from '@playwright/test';

/** Waits for entrance animations so contrast checks see final colours. */
export async function settle(page: Page) {
	await page.waitForFunction(() =>
		document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity)
	);
}

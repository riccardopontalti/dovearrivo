import type { Page } from '@playwright/test';

/** Waits for time-based entrance animations so contrast checks see final colours. Loops and
 * scroll-driven animations (which run for as long as the page is open) are ignored. */
export async function settle(page: Page) {
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity || !(a.timeline instanceof DocumentTimeline))
	);
}

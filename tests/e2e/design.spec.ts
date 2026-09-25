import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { settle } from './helpers';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag22aa'];

/** Today's date in Rome, as the server and the caption compute it. */
function romeToday(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
}

test('the day ribbon shows outbound, stay and return inside the chosen window', async ({ page }) => {
	await page.goto('/?from=syn_A&fromQuery=Origine+sintetica+A&start=08:00&end=20:00');
	const card = page.getByRole('article', { name: 'Destinazione sintetica B' });
	const ribbon = card.getByRole('img', { name: /La giornata: andata 09:00–09:30, permanenza 5 h 30 min, ritorno 15:00–15:30\./ });
	await expect(ribbon).toBeVisible();
	await expect(ribbon).toContainText('entro le 20:00');
	// The mock has no later return: the ribbon has no backup segment and the card says so.
	await expect(ribbon.locator('.backup')).toHaveCount(0);
	await expect(card).toContainText('Nessun rientro successivo trovato');
});

test('the home bloom replays reachability data and states it in text', async ({ page, baseURL }) => {
	const external: string[] = [];
	page.on('request', (r) => {
		if (!r.url().startsWith(baseURL!) && !r.url().startsWith('data:')) external.push(r.url());
	});
	// The endpoint answers with real one-to-all data from the backend (mock: stop A).
	const real = await (await page.request.get('/bloom')).json();
	expect(real.origin?.name ?? real.unavailable).toBeTruthy();

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.route('**/bloom', (route) =>
		route.fulfill({
			json: {
				origin: { name: 'Trento', point: { lat: 46.0719, lon: 11.1194 } },
				departAfter: `${romeToday()}T14:00:00+02:00`,
				minutes: 90,
				dataVersion: 'test',
				points: [11.12, 46.07, 5, 11.2, 46.1, 40, 11.3, 46.0, 85]
			}
		})
	);
	await page.goto('/');
	await expect(page.getByText('Da Trento, partendo oggi alle 14:00: 3 fermate raggiungibili entro 90 minuti.')).toBeVisible();
	// Reduced motion: the final state at once, no replay.
	await expect(page.getByText('14:00 → 15:30')).toBeVisible();
	await page.getByText('Quando e filtri').click();
	await settle(page);
	expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
	// Fonts, illustration and data all come from our server.
	expect(external).toEqual([]);
});

test('quick day choices set the date and the summary follows', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Quando e filtri').click();
	const today = romeToday();
	await page.getByRole('button', { name: 'Oggi' }).click();
	await expect(page.getByLabel('Giorno', { exact: true })).toHaveValue(today);
	await expect(page.getByRole('button', { name: 'Oggi' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByLabel('Libero dalle').fill('10:00');
	await expect(page.locator('summary', { hasText: 'Quando e filtri' })).toContainText('10:00–19:00');
});

test('on phones the results are a sheet over the map', async ({ page }, info) => {
	test.skip(info.project.name !== 'mobile', 'phone layout');
	await page.goto('/?from=syn_A&fromQuery=Origine+sintetica+A');
	const handle = page.getByRole('button', { name: 'Espandi o riduci i risultati' });
	await expect(handle).toHaveAttribute('aria-expanded', 'false');
	await handle.click();
	await expect(handle).toHaveAttribute('aria-expanded', 'true');
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);

	// Choosing a destination brings the map back into view.
	const card = page.getByRole('article', { name: 'Destinazione sintetica B' });
	await card.getByRole('button', { name: 'Mostra sulla mappa' }).click();
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	await expect(handle).toHaveAttribute('aria-expanded', 'false');
	await expect(card.getByRole('button', { name: 'Mostra sulla mappa' })).toHaveAttribute('aria-pressed', 'true');
});

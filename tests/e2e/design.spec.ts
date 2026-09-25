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

test('the departures board lists real trips with their way back and links to them', async ({ page, baseURL }) => {
	const external: string[] = [];
	page.on('request', (r) => {
		if (!r.url().startsWith(baseURL!) && !r.url().startsWith('data:')) external.push(r.url());
	});
	// The endpoint runs the real search (mock backend here) for the next hours.
	const real = await (await page.request.get('/board')).json();
	expect(real.start).toMatch(/^\d{2}:00$/);

	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.route('**/board?*', (route) =>
		route.fulfill({
			json: {
				origin: { name: 'Trento', from: '46.0719,11.1194' },
				date: romeToday(),
				start: '14:00',
				end: '22:00',
				partial: false,
				dataVersion: 'test',
				limits: { maxJourneyMinutes: 90, minStayMinutes: 60, maxWalkMinutes: 15, maxTransfers: 1 },
				rows: [
					{ id: 'levico', name: 'Levico Terme – lungolago', category: 'lake', depart: '14:12', arrive: '14:41', leave: '19:47', home: '20:16', backup: '20:47' }
				]
			}
		})
	);
	await page.goto('/');
	// The flaps spin when the board comes into view.
	await page.getByRole('region', { name: 'Partenze da Trento' }).scrollIntoViewIfNeeded();
	const row = page.getByRole('link', { name: /Levico Terme – lungolago: parti alle 14:12, arrivi alle 14:41, riparti alle 19:47 e sei di ritorno alle 20:16\. Rientro di riserva alle 20:47\./ });
	await expect(row).toBeVisible();
	await expect(row).toHaveAttribute('href', /from=46\.0719%2C11\.1194.*start=14%3A00.*end=22%3A00.*#card-levico$/);
	await expect(page.getByText('si parte dalle 14:00, si torna entro le 22:00')).toBeVisible();
	await page.locator('summary', { hasText: 'Quando e filtri' }).click();
	await settle(page);
	expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
	// Fonts, illustrations and data all come from our server.
	expect(external).toEqual([]);
});

test('the reach map replays reachability data and states it in text', async ({ page }) => {
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
	const section = page.getByRole('region', { name: 'Fin dove arrivi in 90 minuti' });
	await section.scrollIntoViewIfNeeded();
	// Reduced motion: the final state at once, no scroll scrubbing.
	await expect(section).toContainText('entro 90 min');
	await expect(section).toContainText('3 fermate');
	await expect(section).toContainText('Da Trento, partendo oggi alle 14:00: 3 fermate raggiungibili entro 90 minuti.');
});

test('the theme switch changes the theme and the choice survives a reload', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Passa al tema scuro' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.reload();
	// Rendered by the server from the cookie: no flash of the other theme.
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('button', { name: 'Passa al tema chiaro' })).toBeVisible();
	await settle(page);
	expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
});

test('quick day choices set the date and the summary follows', async ({ page }) => {
	await page.goto('/');
	await page.locator('summary', { hasText: 'Quando e filtri' }).click();
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

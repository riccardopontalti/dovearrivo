import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('complete search flow with the stop picker', async ({ page }) => {
	await page.goto('/');
	const from = page.getByRole('combobox', { name: 'Parto da' });
	await from.fill('sint');
	await expect(page.getByRole('option', { name: /Origine sintetica A/ })).toBeVisible();
	await from.press('ArrowDown');
	await from.press('Enter');
	await expect(from).toHaveValue('Origine sintetica A');

	await page.getByRole('button', { name: 'Cerca mete' }).click();
	const card = page.getByRole('article', { name: 'Destinazione sintetica B' });
	await expect(card).toBeVisible();
	await expect(card).toContainText('5 h 30 min');
	await expect(card).toContainText('09:00 → 09:30');
	await expect(card).toContainText('15:00 → 15:30');
	await expect(card).toContainText('Nessun rientro successivo trovato');
	await expect(page).toHaveURL(/from=syn_A/);

	await card.getByText('Dettagli degli itinerari').click();
	await expect(card.getByText('Origine sintetica A → Destinazione sintetica B')).toBeVisible();
});

test('filters that exclude every pair give a complete empty result', async ({ page }) => {
	await page.goto('/?from=syn_A&fromQuery=Origine+sintetica+A&minStayMinutes=480');
	await expect(page.getByText('Nessuna proposta trovata con questi filtri')).toBeVisible();
});

test('invalid windows and unknown stops are explained, not hidden', async ({ page }) => {
	await page.goto('/?from=syn_A&fromQuery=A&start=10:00&end=11:00');
	await expect(page.getByRole('alert')).toContainText('tra 2 e 16 ore');
	await page.goto('/?from=tte_99999&fromQuery=Vecchia');
	await expect(page.getByRole('alert')).toContainText('non è nei dati attuali');
});

test('language switch keeps the search', async ({ page }) => {
	await page.goto('/?from=syn_A&fromQuery=Origine+sintetica+A');
	await page.getByRole('link', { name: 'English' }).click();
	await expect(page.getByRole('heading', { name: 'Recommended destinations' })).toBeVisible();
	await expect(page.getByRole('article', { name: 'Synthetic destination B' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('search page and results pass automated accessibility checks', async ({ page }) => {
	await page.goto('/');
	expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations).toEqual([]);
	await page.goto('/?from=syn_A&fromQuery=Origine+sintetica+A');
	await page.getByText('Dettagli degli itinerari').click();
	expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations).toEqual([]);
	await page.goto('/data-status');
	expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a typed stop name is resolved on the server', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('combobox', { name: 'Parto da' }).fill('Origine sintetica');
		await page.getByRole('button', { name: 'Cerca mete' }).click();
		await expect(page.getByRole('article', { name: 'Destinazione sintetica B' })).toBeVisible();
	});

	test('an ambiguous name offers a choice of stops', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('combobox', { name: 'Parto da' }).fill('sintetica');
		await page.getByRole('button', { name: 'Cerca mete' }).click();
		await expect(page.getByRole('heading', { name: 'Scegli il punto di partenza' })).toBeVisible();
		await page.getByRole('link', { name: 'Origine sintetica A' }).click();
		await expect(page.getByRole('article', { name: 'Destinazione sintetica B' })).toBeVisible();
	});
});

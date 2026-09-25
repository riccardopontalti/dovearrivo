// Light/dark preference. Stored in a cookie (not personal data: one word, no identifier) so
// the server renders the right theme on the first byte. Without a choice the site is light.
export const THEME_COOKIE = 'theme';
export type Theme = 'light' | 'dark';

export function themeFromCookie(value: string | undefined): Theme | undefined {
	return value === 'light' || value === 'dark' ? value : undefined;
}

/** The theme in effect on this page: the stored choice, otherwise light. */
export function effectiveTheme(): Theme {
	return themeFromCookie(document.documentElement.dataset.theme) ?? 'light';
}

export function storeTheme(theme: Theme): void {
	document.documentElement.dataset.theme = theme;
	document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

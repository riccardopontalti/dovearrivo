import { describe, expect, it } from 'vitest';
import { themeFromCookie } from './theme';

describe('themeFromCookie', () => {
	it('accepts only the two known themes, so nothing else reaches the HTML', () => {
		expect(themeFromCookie('dark')).toBe('dark');
		expect(themeFromCookie('light')).toBe('light');
		expect(themeFromCookie('"><script>')).toBeUndefined();
		expect(themeFromCookie(undefined)).toBeUndefined();
	});
});

import { en } from './en';
import { it, type Messages } from './it';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

const catalogues: Record<Locale, Messages> = { it, en };

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Locale requested by the `lang` URL parameter. Reading it inside a load function makes
 * SvelteKit rerun that load when the language changes. */
export function localeFromUrl(url: URL): Locale {
	const requested = url.searchParams.get('lang');
	return isLocale(requested) ? requested : defaultLocale;
}

export function messages(locale: Locale): Messages {
	return catalogues[locale];
}

/** Replaces {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export type { Messages };

import { en } from './en';
import { it, type Messages } from './it';

export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

const catalogues: Record<Locale, Messages> = { it, en };

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function messages(locale: Locale): Messages {
	return catalogues[locale];
}

export type { Messages };

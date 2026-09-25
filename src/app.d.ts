import type { Locale } from '$lib/i18n';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: Locale;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

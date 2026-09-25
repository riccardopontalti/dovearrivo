// Split-flap helpers: the character set of the flaps and the sequence a flap shows on its
// way to a target, like a real board that has to spin through intermediate cards.
export const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZÀÈÉÌÒÙ0123456789:.-\'/';

/** Uppercase text fitted to `length` flaps; characters without a card become spaces. */
export function toFlaps(text: string, length: number, align: 'left' | 'right' = 'left'): string[] {
	const clean = [...text.toLocaleUpperCase('it').replace(/[–—]/g, '-')]
		.map((c) => (FLAP_CHARS.includes(c) ? c : ' '))
		.join('')
		.replace(/\s+/g, ' ')
		.trim();
	let fitted = clean.length > length ? clean.slice(0, length).trimEnd() : clean;
	fitted = align === 'right' ? fitted.padStart(length) : fitted.padEnd(length);
	return [...fitted];
}

/** Cards shown from `from` to `to`: forward through the set, at most `max` steps. */
export function flapSequence(from: string, to: string, max = 8): string[] {
	if (from === to) return [];
	const a = Math.max(0, FLAP_CHARS.indexOf(from));
	const b = Math.max(0, FLAP_CHARS.indexOf(to));
	const distance = (b - a + FLAP_CHARS.length) % FLAP_CHARS.length;
	const steps = Math.min(distance, max);
	// Skip ahead so the last steps are the cards just before the target.
	const start = (b - steps + FLAP_CHARS.length) % FLAP_CHARS.length;
	return Array.from({ length: steps }, (_, i) => FLAP_CHARS[(start + i + 1) % FLAP_CHARS.length]);
}

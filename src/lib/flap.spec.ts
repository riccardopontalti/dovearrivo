import { describe, expect, it } from 'vitest';
import { flapSequence, toFlaps } from './flap';

describe('toFlaps', () => {
	it('uppercases, keeps Italian accents and fits the width', () => {
		expect(toFlaps('Levico Terme – lungolago', 16).join('')).toBe('LEVICO TERME - L');
		expect(toFlaps('Città', 6).join('')).toBe('CITTÀ ');
		expect(toFlaps('9:05', 5, 'right').join('')).toBe(' 9:05');
	});

	it('does not end a truncated name with a space', () => {
		expect(toFlaps('Lago di Caldonazzo', 8).join('')).toBe('LAGO DI ');
		expect(toFlaps('Lago di Caldonazzo', 8)).toHaveLength(8);
	});
});

describe('flapSequence', () => {
	it('ends on the target after the cards that precede it', () => {
		expect(flapSequence(' ', 'D', 3)).toEqual(['B', 'C', 'D']);
		expect(flapSequence('A', 'C')).toEqual(['B', 'C']);
	});

	it('is empty when the flap already shows the target', () => {
		expect(flapSequence('7', '7')).toEqual([]);
	});
});

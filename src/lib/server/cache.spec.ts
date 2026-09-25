import { describe, expect, it } from 'vitest';
import { LruCache } from './cache';

describe('LruCache', () => {
	it('expires entries after the TTL', () => {
		let now = 0;
		const cache = new LruCache<string>(100, 1000, () => now);
		cache.set('k', 'v', 1);
		now = 999;
		expect(cache.get('k')).toBe('v');
		now = 1000;
		expect(cache.get('k')).toBeUndefined();
	});

	it('evicts the least recently used entries beyond the byte budget', () => {
		const cache = new LruCache<number>(10, 60_000);
		cache.set('a', 1, 4);
		cache.set('b', 2, 4);
		cache.get('a');
		cache.set('c', 3, 4);
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBe(1);
		expect(cache.get('c')).toBe(3);
	});
});

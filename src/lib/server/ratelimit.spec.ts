import { describe, expect, it } from 'vitest';
import { SearchAdmission } from './ratelimit';

const quick = () => Promise.resolve('ok');

describe('SearchAdmission', () => {
	it('allows 12 starts per minute per IP, then answers 429 with Retry-After', async () => {
		let now = 0;
		const a = new SearchAdmission({ perIpActive: 2, perIpPerMinute: 12, globalActive: 10, now: () => now });
		for (let i = 0; i < 12; i++) await a.run('1.2.3.4', quick);
		await expect(a.run('1.2.3.4', quick)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED', headers: { 'retry-after': '60' } });
		await expect(a.run('5.6.7.8', quick)).resolves.toBe('ok');
		now = 60_000;
		await expect(a.run('1.2.3.4', quick)).resolves.toBe('ok');
	});

	it('limits concurrent searches per IP and globally', async () => {
		const a = new SearchAdmission({ perIpActive: 2, perIpPerMinute: 100, globalActive: 3 });
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const slow = () => gate.then(() => 'done');
		const running = [a.run('ip1', slow), a.run('ip1', slow)];
		await expect(a.run('ip1', quick)).rejects.toMatchObject({ status: 429 });
		running.push(a.run('ip2', slow));
		await expect(a.run('ip3', quick)).rejects.toMatchObject({ status: 429 });
		release();
		await Promise.all(running);
		await expect(a.run('ip1', quick)).resolves.toBe('ok');
	});
});

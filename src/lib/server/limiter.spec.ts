import { describe, expect, it } from 'vitest';
import { Limiter } from './limiter';

describe('Limiter', () => {
	it('never runs more than the limit at once and runs everything', async () => {
		const limiter = new Limiter(4);
		let active = 0;
		let peak = 0;
		const task = async () => {
			active++;
			peak = Math.max(peak, active);
			await new Promise((r) => setTimeout(r, 5));
			active--;
		};
		await Promise.all(Array.from({ length: 20 }, () => limiter.run(task)));
		expect(peak).toBe(4);
		expect(active).toBe(0);
	});

	it('drops queued tasks when their signal aborts', async () => {
		const limiter = new Limiter(1);
		let release!: () => void;
		const blocker = limiter.run(() => new Promise<void>((r) => (release = r)));
		const controller = new AbortController();
		let ran = false;
		const queued = limiter.run(async () => {
			ran = true;
		}, controller.signal);
		controller.abort(new Error('budget'));
		await expect(queued).rejects.toThrow('budget');
		release();
		await blocker;
		expect(ran).toBe(false);
		await expect(limiter.run(async () => 'free')).resolves.toBe('free');
	});
});

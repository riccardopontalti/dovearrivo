/** Counting semaphore: at most `limit` tasks run at once, the rest wait in FIFO order. */
export class Limiter {
	private active = 0;
	private readonly queue: Array<() => void> = [];

	constructor(private readonly limit: number) {}

	async run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
		await this.acquire(signal);
		try {
			return await task();
		} finally {
			this.release();
		}
	}

	private acquire(signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) return Promise.reject(signal.reason);
		if (this.active < this.limit) {
			this.active++;
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			const grant = () => {
				signal?.removeEventListener('abort', onAbort);
				this.active++;
				resolve();
			};
			const onAbort = () => {
				const i = this.queue.indexOf(grant);
				if (i >= 0) this.queue.splice(i, 1);
				reject(signal?.reason);
			};
			signal?.addEventListener('abort', onAbort, { once: true });
			this.queue.push(grant);
		});
	}

	private release(): void {
		this.active--;
		this.queue.shift()?.();
	}
}

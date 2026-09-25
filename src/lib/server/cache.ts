/** Small LRU cache with a time-to-live and an approximate byte budget. */
export class LruCache<V> {
	private readonly entries = new Map<string, { value: V; expires: number; bytes: number }>();
	private bytes = 0;

	constructor(
		private readonly maxBytes: number,
		private readonly ttlMs: number,
		private readonly now: () => number = Date.now
	) {}

	get(key: string): V | undefined {
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		if (entry.expires <= this.now()) {
			this.delete(key);
			return undefined;
		}
		this.entries.delete(key);
		this.entries.set(key, entry);
		return entry.value;
	}

	set(key: string, value: V, bytes: number): void {
		if (bytes > this.maxBytes) return;
		this.delete(key);
		this.entries.set(key, { value, expires: this.now() + this.ttlMs, bytes });
		this.bytes += bytes;
		for (const oldest of this.entries.keys()) {
			if (this.bytes <= this.maxBytes) break;
			this.delete(oldest);
		}
	}

	clear(): void {
		this.entries.clear();
		this.bytes = 0;
	}

	private delete(key: string): void {
		const entry = this.entries.get(key);
		if (!entry) return;
		this.bytes -= entry.bytes;
		this.entries.delete(key);
	}
}

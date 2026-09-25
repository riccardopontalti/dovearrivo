// Admission control for expensive requests (searches and reachability previews), from
// docs/OPERATIONS.md: per IP at most 2 active and 12 started per minute; at most 10
// searches running or waiting globally. IPs live only in memory with a short expiry.
import { ApiError } from './errors';

export interface RateLimitOptions {
	perIpActive: number;
	perIpPerMinute: number;
	globalActive: number;
	now?: () => number;
}

interface IpState {
	active: number;
	starts: number[];
}

export class SearchAdmission {
	private readonly ips = new Map<string, IpState>();
	private global = 0;
	private readonly now: () => number;

	constructor(private readonly options: RateLimitOptions) {
		this.now = options.now ?? Date.now;
	}

	/** Runs `task` if admitted, otherwise throws a 429 ApiError with Retry-After. */
	async run<T>(ip: string, task: () => Promise<T>): Promise<T> {
		const now = this.now();
		const state = this.ips.get(ip) ?? { active: 0, starts: [] };
		state.starts = state.starts.filter((t) => now - t < 60_000);

		if (this.global >= this.options.globalActive) throw limited(5);
		if (state.active >= this.options.perIpActive) throw limited(5);
		if (state.starts.length >= this.options.perIpPerMinute) {
			throw limited(Math.max(1, Math.ceil((state.starts[0] + 60_000 - now) / 1000)));
		}

		state.active++;
		state.starts.push(now);
		this.ips.set(ip, state);
		this.global++;
		try {
			return await task();
		} finally {
			state.active--;
			this.global--;
			if (state.active === 0 && state.starts.length === 0) this.ips.delete(ip);
			this.sweep();
		}
	}

	/** Forgets IPs with no activity in the last minute. */
	private sweep(): void {
		const now = this.now();
		for (const [ip, s] of this.ips) {
			if (s.active === 0 && s.starts.every((t) => now - t >= 60_000)) this.ips.delete(ip);
		}
	}
}

function limited(seconds: number): ApiError {
	return new ApiError(429, 'RATE_LIMITED', 'Too many searches, please retry shortly', {
		'retry-after': String(seconds)
	});
}

export const admission = new SearchAdmission({ perIpActive: 2, perIpPerMinute: 12, globalActive: 10 });

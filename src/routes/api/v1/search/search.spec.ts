import { describe, expect, it } from 'vitest';
import { validate } from '$lib/api/validate';
import { addDays, formatInstant, localDate, localToMillis } from '$lib/domain/time';
import { POST } from './+server';

type Event = Parameters<typeof POST>[0];

function post(body: string): Promise<Response> {
	const request = new Request('http://localhost/api/v1/search', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
	return POST({ request } as Event) as Promise<Response>;
}

// A covered date in the future, so the test does not depend on the day it runs.
const tomorrow = addDays(localDate(Date.now()), 1);
const valid = {
	originStopId: 'syn_A',
	departAfter: formatInstant(localToMillis(tomorrow, '08:00')),
	returnBy: formatInstant(localToMillis(tomorrow, '18:00'))
};

async function expectProblem(response: Response, status: number, code: string) {
	expect(response.status).toBe(status);
	const body = await response.json();
	expect(validate('Problem', body)).toEqual({ ok: true });
	expect(body.code).toBe(code);
}

describe('POST /api/v1/search', () => {
	it('answers a valid request with a contract-conforming response and applied defaults', async () => {
		const response = await post(JSON.stringify(valid));
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(validate('SearchResponse', body)).toEqual({ ok: true });
		expect(body.normalizedRequest.maxJourneyMinutes).toBe(90);
	});

	it('rejects malformed JSON, unknown fields and bad limits with 400', async () => {
		await expectProblem(await post('{'), 400, 'INVALID_REQUEST');
		await expectProblem(await post(JSON.stringify({ ...valid, extra: 1 })), 400, 'INVALID_REQUEST');
		await expectProblem(
			await post(JSON.stringify({ ...valid, maxTransfers: 3 })),
			400,
			'INVALID_REQUEST'
		);
	});

	it('rejects oversized bodies with 413', async () => {
		await expectProblem(await post(' '.repeat(17 * 1024)), 413, 'REQUEST_TOO_LARGE');
	});

	it('rejects an unknown origin with 422', async () => {
		await expectProblem(
			await post(JSON.stringify({ ...valid, originStopId: 'unknown' })),
			422,
			'UNKNOWN_ORIGIN'
		);
	});
});

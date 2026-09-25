import { json } from '@sveltejs/kit';
import type { ProblemCode } from '$lib/api/types';

/** An error that maps to a Problem response of the public contract. */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: ProblemCode,
		message: string,
		readonly headers: Record<string, string> = {}
	) {
		super(message);
	}
}

export function problemResponse(error: ApiError): Response {
	return json(
		{ code: error.code, message: error.message.slice(0, 250) },
		{ status: error.status, headers: error.headers }
	);
}

/** Runs a handler and converts ApiError into a Problem response; other errors become 503. */
export async function withProblems(handler: () => Promise<Response>): Promise<Response> {
	try {
		return await handler();
	} catch (error) {
		if (error instanceof ApiError) return problemResponse(error);
		console.error(error);
		return problemResponse(
			new ApiError(503, 'ROUTING_UNAVAILABLE', 'The service is temporarily unavailable')
		);
	}
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads a JSON body with a size limit; malformed or oversized bodies become Problems. */
export async function readJson(request: Request): Promise<unknown> {
	const declared = Number(request.headers.get('content-length') ?? '0');
	if (declared > MAX_BODY_BYTES) {
		throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The request body is too large');
	}
	const text = await request.text();
	if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
		throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The request body is too large');
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new ApiError(400, 'INVALID_REQUEST', 'The request body is not valid JSON');
	}
}

import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { schemas } from './schemas.gen';
import type { SchemaName } from './types';

const DOCUMENT_ID = 'dovearrivo-api';

const ajv = new Ajv2020({ allErrors: false, strict: false });
addFormats.default(ajv);
ajv.addSchema({ $id: DOCUMENT_ID, components: { schemas } });

const cache = new Map<SchemaName, ValidateFunction>();

function compiled(name: SchemaName): ValidateFunction {
	let fn = cache.get(name);
	if (!fn) {
		fn = ajv.compile({ $ref: `${DOCUMENT_ID}#/components/schemas/${name}` });
		cache.set(name, fn);
	}
	return fn;
}

export type ValidationResult = { ok: true } | { ok: false; message: string };

/** Validates a value against a schema of the OpenAPI contract. */
export function validate(name: SchemaName, value: unknown): ValidationResult {
	const fn = compiled(name);
	if (fn(value)) return { ok: true };
	return { ok: false, message: describe(fn.errors?.[0]) };
}

function describe(error: ErrorObject | undefined): string {
	if (!error) return 'Invalid value';
	const path = error.instancePath || '(root)';
	if (error.keyword === 'additionalProperties') {
		return `${path}: unknown property "${String(error.params.additionalProperty)}"`;
	}
	return `${path} ${error.message ?? 'is invalid'}`.slice(0, 250);
}

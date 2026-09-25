import type { components } from './types.gen';

type Schemas = components['schemas'];

export type Point = Schemas['Point'];
export type Stop = Schemas['Stop'];
export type Destination = Schemas['Destination'];
export type SearchRequest = Schemas['SearchRequest'];
export type SearchResponse = Schemas['SearchResponse'];
export type Proposal = Schemas['Proposal'];
export type Journey = Schemas['Journey'];
export type Leg = Schemas['Leg'];
export type Place = Schemas['Place'];
export type DataStatus = Schemas['DataStatus'];
export type Problem = Schemas['Problem'];
export type ProblemCode = Problem['code'];
export type SchemaName = keyof Schemas;

/** A search request after defaults have been applied: every limit is present. */
export type NormalizedSearchRequest = Required<SearchRequest>;

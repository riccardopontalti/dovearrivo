// Aggregation of per-destination results into a search status (docs/ROUTING.md,
// "Pages, deadlines and completeness"). A failure on one destination never cancels the
// others, and a technical failure is never reported as "no proposals".
import type { Proposal, SearchResponse } from '$lib/api/types';
import { rankProposals } from './ranking';

export type DestinationOutcome =
	| { destinationId: string; kind: 'evaluated'; proposal: Proposal | null; truncated?: boolean }
	| { destinationId: string; kind: 'timeout' | 'upstream_error' };

type Warning = SearchResponse['warnings'][number];

export interface SearchSummary {
	status: SearchResponse['status'];
	catalogCount: number;
	evaluatedCount: number;
	warnings: Warning[];
	proposals: Proposal[];
	/** True when the catalogue is not empty and no destination could be evaluated. */
	allFailed: boolean;
}

export function summarize(
	outcomes: DestinationOutcome[],
	extraWarnings: Warning[] = []
): SearchSummary {
	const warnings = new Set<Warning>(extraWarnings);
	const proposals: Proposal[] = [];
	let evaluated = 0;

	for (const o of outcomes) {
		if (o.kind === 'evaluated') {
			evaluated++;
			if (o.truncated) warnings.add('PARTIAL_TRUNCATED');
			if (o.proposal) proposals.push(o.proposal);
		} else if (o.kind === 'timeout') {
			warnings.add('PARTIAL_TIMEOUT');
		} else {
			warnings.add('PARTIAL_UPSTREAM_ERROR');
		}
	}

	const partial = [...warnings].some((w) => w.startsWith('PARTIAL_'));
	return {
		status: partial ? 'partial' : 'complete',
		catalogCount: outcomes.length,
		evaluatedCount: evaluated,
		warnings: [...warnings],
		proposals: rankProposals(proposals),
		allFailed: outcomes.length > 0 && evaluated === 0
	};
}

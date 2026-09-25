// Ranking of destinations under "Recommended" (docs/ROUTING.md): backup available,
// stay descending, total duration, transfers, walking, identifier.
import type { Proposal } from '$lib/api/types';
import { durationSeconds, walkingSeconds } from './constraints';

function key(p: Proposal) {
	return {
		backup: p.returnStatus === 'later_option_found' ? 1 : 0,
		stay: p.staySeconds,
		duration: durationSeconds(p.outbound) + durationSeconds(p.inbound),
		transfers: p.outbound.transfers + p.inbound.transfers,
		walking: walkingSeconds(p.outbound) + walkingSeconds(p.inbound)
	};
}

export function rankProposals(proposals: Proposal[]): Proposal[] {
	return proposals
		.map((p) => ({ p, k: key(p) }))
		.sort(
			(a, b) =>
				b.k.backup - a.k.backup ||
				b.k.stay - a.k.stay ||
				a.k.duration - b.k.duration ||
				a.k.transfers - b.k.transfers ||
				a.k.walking - b.k.walking ||
				a.p.destinationId.localeCompare(b.p.destinationId)
		)
		.map(({ p }) => p);
}

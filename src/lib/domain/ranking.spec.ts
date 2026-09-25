import { describe, expect, it } from 'vitest';
import type { Proposal } from '$lib/api/types';
import { journeyOf, leg } from './fixtures';
import { rankProposals } from './ranking';

const DAY = '2026-09-26';

function proposal(id: string, back: string, backup: boolean, transfers = 0): Proposal {
	const outbound = journeyOf([leg('BUS', DAY, '09:00', '09:30', `o-${id}`)], transfers);
	const inbound = journeyOf([leg('BUS', DAY, back, '17:30', `i-${id}`)]);
	return {
		destinationId: id,
		outbound,
		inbound,
		staySeconds: (Date.parse(inbound.startTime) - Date.parse(outbound.endTime)) / 1000,
		returnStatus: backup ? 'later_option_found' : 'no_later_option_found',
		...(backup ? { backupInbound: inbound } : {})
	};
}

describe('rankProposals', () => {
	it('orders by backup, then stay, then transfers, then identifier', () => {
		const ranked = rankProposals([
			proposal('long-no-backup', '17:00', false),
			proposal('short-backup', '15:00', true),
			proposal('long-backup-1-transfer', '16:00', true, 1),
			proposal('long-backup-b', '16:00', true),
			proposal('long-backup-a', '16:00', true)
		]).map((p) => p.destinationId);

		expect(ranked).toEqual([
			'long-backup-a',
			'long-backup-b',
			'long-backup-1-transfer',
			'short-backup',
			'long-no-backup'
		]);
	});
});

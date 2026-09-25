// MobilityData GTFS validator: blocking errors, documented waivers, recorded warnings.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Notice {
	code: string;
	severity: 'ERROR' | 'WARNING' | 'INFO';
	totalNotices: number;
}

export interface Waiver {
	source: string;
	code: string;
	reason: string;
}

export interface ValidatorVerdict {
	blocking: string[];
	waived: string[];
	warnings: number;
	infos: number;
}

/** ERROR notices block the snapshot unless a waiver with a reason names the source and code. */
export function validatorVerdict(source: string, notices: Notice[], waivers: Waiver[]): ValidatorVerdict {
	const verdict: ValidatorVerdict = { blocking: [], waived: [], warnings: 0, infos: 0 };
	for (const n of notices) {
		if (n.severity === 'WARNING') verdict.warnings += n.totalNotices;
		else if (n.severity === 'INFO') verdict.infos += n.totalNotices;
		else {
			const waiver = waivers.find((w) => w.source === source && w.code === n.code && w.reason.trim());
			(waiver ? verdict.waived : verdict.blocking).push(`${n.code} (${n.totalNotices})`);
		}
	}
	return verdict;
}

/** Validates a feed once per file: the output directory is keyed by content hash. */
export function runValidator(jar: string, zip: string, outDir: string): Promise<Notice[]> {
	const cached = join(outDir, 'report.json');
	if (existsSync(cached)) {
		return Promise.resolve((JSON.parse(readFileSync(cached, 'utf8')) as { notices: Notice[] }).notices);
	}
	return new Promise((resolve, reject) => {
		const child = spawn('java', ['-jar', jar, '-i', zip, '-o', outDir], { stdio: 'ignore' });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) return reject(new Error(`GTFS validator exited with ${code}`));
			try {
				const report = JSON.parse(readFileSync(join(outDir, 'report.json'), 'utf8')) as { notices: Notice[] };
				resolve(report.notices);
			} catch (error) {
				reject(error);
			}
		});
	});
}

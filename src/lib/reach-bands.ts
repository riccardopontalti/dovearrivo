// Ordinal time bands of the reachability preview. Colours: one-hue blue ramps validated
// with the dataviz ordinal checks (light and dark surfaces), more minutes = more contrast.
export const BAND_LIMITS = [30, 60, 90, 120, Infinity] as const;

export const BAND_COLORS = {
	light: ['#86b6ef', '#3987e5', '#256abf', '#184f95', '#0d366b'],
	dark: ['#184f95', '#2a78d6', '#5598e7', '#86b6ef', '#b7d3f6']
} as const;

export function bandOf(minutes: number): number {
	return BAND_LIMITS.findIndex((limit) => minutes <= limit);
}

/** Number of places per band, up to the searched duration. */
export function countByBand(places: Array<{ minutes: number }>): number[] {
	const counts = BAND_LIMITS.map(() => 0);
	for (const p of places) counts[bandOf(p.minutes)]++;
	return counts;
}

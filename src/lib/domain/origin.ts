// The origin of a search is either a stop or a point (from geocoding).
import type { Point, SearchRequest } from '$lib/api/types';

export type Origin = { kind: 'stop'; stopId: string } | { kind: 'point'; point: Point; name?: string };

export function originOf(request: Pick<SearchRequest, 'originStopId' | 'originPoint' | 'originName'>): Origin {
	if (request.originPoint) return { kind: 'point', point: request.originPoint, name: request.originName };
	if (request.originStopId) return { kind: 'stop', stopId: request.originStopId };
	throw new Error('Search request without origin');
}

/** Coverage box as [minLon, minLat, maxLon, maxLat]. */
export type Bbox = [number, number, number, number];

export function insideBbox(point: Point, bbox: Bbox): boolean {
	return point.lon >= bbox[0] && point.lat >= bbox[1] && point.lon <= bbox[2] && point.lat <= bbox[3];
}

// Encoded polyline decoding with an explicit precision (MOTIS uses 6, Google uses 5).
// Returns GeoJSON order: [longitude, latitude].

export function decodePolyline(encoded: string, precision: number): Array<[number, number]> {
	if (!Number.isInteger(precision) || precision < 0 || precision > 8) {
		throw new RangeError(`Unsupported polyline precision: ${precision}`);
	}
	const factor = 10 ** precision;
	const coords: Array<[number, number]> = [];
	let index = 0;
	let lat = 0;
	let lon = 0;

	const next = (): number => {
		let result = 0;
		let shift = 0;
		let byte: number;
		do {
			if (index >= encoded.length) throw new RangeError('Truncated polyline');
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);
		return result & 1 ? ~(result >> 1) : result >> 1;
	};

	while (index < encoded.length) {
		lat += next();
		lon += next();
		coords.push([lon / factor, lat / factor]);
	}
	return coords;
}

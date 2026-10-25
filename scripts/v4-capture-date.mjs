const datePattern = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

const captureInstant = (value) => {
	const match = value.match(datePattern);
	if (!match) return undefined;
	const [, year, month, day, hour, minute, second] = match;
	const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
	return Number.isNaN(Date.parse(iso)) ? undefined : iso;
};

// Reads DateTimeOriginal, then DateTimeDigitized, then DateTime. GPS is ignored.
export const readCaptureDate = (exif) => {
	if (!exif || exif.length < 8) return undefined;
	const offset = exif.subarray(0, 4).toString('ascii') === 'Exif' ? 6 : 0;
	const view = exif.subarray(offset);
	if (view.length < 8) return undefined;
	const order = view.toString('ascii', 0, 2);
	const little = order === 'II';
	if (!little && order !== 'MM') return undefined;
	const readU16 = (position) => little ? view.readUInt16LE(position) : view.readUInt16BE(position);
	const readU32 = (position) => little ? view.readUInt32LE(position) : view.readUInt32BE(position);
	if (readU16(2) !== 0x2a) return undefined;

	const dates = new Map();
	const readIfd = (ifdOffset) => {
		if (ifdOffset <= 0 || ifdOffset + 2 > view.length) return;
		const count = readU16(ifdOffset);
		for (let index = 0; index < count; index += 1) {
			const entry = ifdOffset + 2 + index * 12;
			if (entry + 12 > view.length) return;
			const tag = readU16(entry);
			const type = readU16(entry + 2);
			const values = readU32(entry + 4);
			const inline = entry + 8;
			if (type === 2 && (tag === 0x0132 || tag === 0x9003 || tag === 0x9004)) {
				const valueOffset = values > 4 ? readU32(inline) : inline;
				if (valueOffset >= 0 && valueOffset + values <= view.length) {
					const raw = view.toString('ascii', valueOffset, valueOffset + values).replace(/\0.*$/, '');
					const instant = captureInstant(raw);
					if (instant) dates.set(tag, instant);
				}
			}
			if (tag === 0x8769 && type === 4 && values === 1) readIfd(readU32(inline));
		}
	};

	try {
		readIfd(readU32(4));
	} catch {
		return undefined;
	}
	return dates.get(0x9003) ?? dates.get(0x9004) ?? dates.get(0x0132);
};

export const exifDateTime = (iso) => `${iso.slice(0, 10).replaceAll('-', ':')} ${iso.slice(11, 19)}`;

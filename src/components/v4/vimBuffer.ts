export type CursorPosition = { line: number; column: number };
export type TextCell = { kind: 'text'; value: string; rawIndex: number; rawAfter: number; href?: string };
type ImageCell = { kind: 'image'; alt: string; src: string; rawIndex: number; rawAfter: number; href?: string };
export type VisualCell = TextCell | ImageCell;

const markdownInlinePattern = /\[!\[([^\]\n]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)\]\((https?:\/\/[^)\s]+)\)|!\[([^\]\n]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

export function buildVisualLines(buffer: string, renderMarkdown = true): VisualCell[][] {
	const lines: VisualCell[][] = [[]];
	let rawCursor = 0;
	const appendText = (text: string, rawStart: number, href?: string) => {
		for (let offset = 0; offset < text.length;) {
			const value = String.fromCodePoint(text.codePointAt(offset) ?? 32);
			const rawIndex = rawStart + offset;
			offset += value.length;
			if (value === '\n') {
				if (!lines.at(-1)?.length) lines.at(-1)?.push({ kind: 'text', value: '\u00a0', rawIndex, rawAfter: rawIndex });
				lines.push([]);
			} else {
				lines.at(-1)?.push({ kind: 'text', value, rawIndex, rawAfter: rawIndex + value.length, href });
			}
		}
	};
	const finish = () => {
		if (!lines.at(-1)?.length) lines.at(-1)?.push({ kind: 'text', value: '\u00a0', rawIndex: buffer.length, rawAfter: buffer.length });
		return lines;
	};

	if (!renderMarkdown) {
		appendText(buffer, 0);
		return finish();
	}

	for (const match of buffer.matchAll(markdownInlinePattern)) {
		const index = match.index ?? 0;
		appendText(buffer.slice(rawCursor, index), rawCursor);
		const rawAfter = index + match[0].length;
		if (match[1] !== undefined) {
			lines.at(-1)?.push({ kind: 'image', alt: match[1], src: match[2], href: match[3], rawIndex: index, rawAfter });
		} else if (match[4] !== undefined) {
			lines.at(-1)?.push({ kind: 'image', alt: match[4], src: match[5], rawIndex: index, rawAfter });
		} else {
			appendText(match[6], index + 1, match[7]);
		}
		rawCursor = rawAfter;
	}

	appendText(buffer.slice(rawCursor), rawCursor);
	return finish();
}

export function wrapVisualLines(lines: VisualCell[][], columns: number): VisualCell[][] {
	return lines.flatMap((cells) => {
		if (cells.length <= columns) return [cells];
		const wrapped: VisualCell[][] = [];
		for (let start = 0; start < cells.length;) {
			let end = Math.min(start + columns, cells.length);
			if (end < cells.length) {
				for (let index = end - 1; index > start; index -= 1) {
					const cell = cells[index];
					if (cell.kind === 'text' && /\s/.test(cell.value)) {
						end = index + 1;
						break;
					}
				}
			}
			wrapped.push(cells.slice(start, end));
			start = end;
		}
		return wrapped;
	});
}

export function cursorForRawIndex(lines: VisualCell[][], rawIndex: number): CursorPosition {
	let closest: CursorPosition = { line: 0, column: 0 };
	for (const [line, cells] of lines.entries()) {
		for (const [column, cell] of cells.entries()) {
			if (rawIndex < cell.rawIndex) return closest;
			closest = { line, column };
			if (rawIndex <= cell.rawAfter) return closest;
		}
	}
	return closest;
}

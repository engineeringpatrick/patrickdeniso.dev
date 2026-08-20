export type CursorPosition = { line: number; column: number };
export type TextCell = { kind: 'text'; value: string; rawIndex: number; rawAfter: number; href?: string };
type ImageCell = { kind: 'image'; alt: string; src: string; rawIndex: number; rawAfter: number; href?: string };
export type VisualCell = TextCell | ImageCell;

const markdownInlinePattern = /\[!\[([^\]\n]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)\]\((https?:\/\/[^)\s]+)\)|!\[([^\]\n]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
const wideCharacterPattern = /[\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6\u{20000}-\u{3fffd}]/u;
const cellWidth = (cell: VisualCell) => cell.kind === 'text' && wideCharacterPattern.test(cell.value) ? 2 : 1;

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
		const wrapped: VisualCell[][] = [];
		for (let start = 0; start < cells.length;) {
			let end = start;
			let width = 0;
			let lastWhitespace = -1;
			while (end < cells.length) {
				const cell = cells[end];
				const nextWidth = cellWidth(cell);
				if (width + nextWidth > columns) break;
				width += nextWidth;
				if (cell.kind === 'text' && /\s/.test(cell.value)) lastWhitespace = end + 1;
				end += 1;
			}
			if (end === start) end += 1;
			else if (end < cells.length && lastWhitespace > start) end = lastWhitespace;
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

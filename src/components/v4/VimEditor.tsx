import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildVisualLines, cursorForRawIndex, wrapVisualLines, type CursorPosition, type TextCell, type VisualCell } from './vimBuffer';
import { readVimBuffer, writeVimBuffer } from './vimSession';

type VimEditorProps = {
	sessionKey: string;
	filename: string;
	initialBuffer: string;
	editableLabel: string;
	normalLabel: string;
	insertLabel: string;
	onQuit: () => void;
	promptPath?: string;
	bufferOverride?: string;
	autoFocus?: boolean;
	className?: string;
};

type VimMode = 'normal' | 'insert' | 'command';

function TextRun({ cells, line, startColumn, cursor }: { cells: TextCell[]; line: number; startColumn: number; cursor: CursorPosition | null }) {
	const cursorOffset = cursor?.line === line ? cursor.column - startColumn : -1;
	if (cursorOffset < 0 || cursorOffset >= cells.length) return <>{cells.map(({ value }) => value).join('')}</>;
	return <>{cells.slice(0, cursorOffset).map(({ value }) => value).join('')}<span className="vim-terminal__caret">{cells[cursorOffset].value}</span>{cells.slice(cursorOffset + 1).map(({ value }) => value).join('')}</>;
}

function LinkedBuffer({ lines, cursor }: { lines: VisualCell[][]; cursor: CursorPosition | null }) {
	return <>{lines.map((cells, line) => {
		const parts: ReactNode[] = [];
		for (let column = 0; column < cells.length;) {
			const cell = cells[column];
			if (cell.kind === 'image') {
				const image = <img className={`vim-terminal__inline-logo${cursor?.line === line && cursor.column === column ? ' is-cursor' : ''}`} src={cell.src} alt={cell.alt} />;
				parts.push(cell.href
					? <a className="vim-terminal__inline-logo-link" href={cell.href} target="_blank" rel="noreferrer" key={`${column}-${cell.src}`}>{image}</a>
					: <Fragment key={`${column}-${cell.src}`}>{image}</Fragment>);
				column += 1;
				continue;
			}

			const startColumn = column;
			const href = cell.href;
			while (column < cells.length && cells[column].kind === 'text' && (cells[column] as TextCell).href === href) column += 1;
			const run = cells.slice(startColumn, column) as TextCell[];
			const content = <TextRun cells={run} line={line} startColumn={startColumn} cursor={cursor} />;
			parts.push(href
				? <a href={href} target="_blank" rel="noreferrer" key={`${startColumn}-${href}`}>{content}</a>
				: <Fragment key={startColumn}>{content}</Fragment>);
		}
		return <div className="vim-terminal__visual-line" key={line}>{parts}</div>;
	})}</>;
}

/** A deliberately small, reusable Vim-like buffer. Visitor edits never leave the browser. */
export default function VimEditor({
	sessionKey,
	filename,
	initialBuffer,
	editableLabel,
	normalLabel,
	insertLabel,
	onQuit,
	promptPath,
	bufferOverride,
	autoFocus = true,
	className = '',
}: VimEditorProps) {
	const editor = useRef<HTMLTextAreaElement>(null);
	const editorShell = useRef<HTMLDivElement>(null);
	const normalBuffer = useRef<HTMLDivElement>(null);
	const lineNumbers = useRef<HTMLOListElement>(null);
	const commandInput = useRef<HTMLInputElement>(null);
	const activeSessionKey = useRef(sessionKey);
	const [buffer, setBuffer] = useState(() => readVimBuffer(sessionKey, initialBuffer));
	const [mode, setMode] = useState<VimMode>('normal');
	const [command, setCommand] = useState('');
	const [countPrefix, setCountPrefix] = useState('');
	const [cursor, setCursor] = useState<CursorPosition>({ line: 0, column: 0 });
	const [wrapColumns, setWrapColumns] = useState(80);
	const preferredColumn = useRef(0);
	const isLocked = bufferOverride !== undefined;
	const visibleBuffer = bufferOverride ?? buffer;
	const visibleMode = isLocked ? 'insert' : mode;
	const renderedLines = useMemo(() => wrapVisualLines(buildVisualLines(visibleBuffer), wrapColumns), [visibleBuffer, wrapColumns]);
	const editableLines = useMemo(() => wrapVisualLines(buildVisualLines(visibleBuffer, false), wrapColumns), [visibleBuffer, wrapColumns]);
	const visualLines = visibleMode === 'insert' ? editableLines : renderedLines;
	const syncLineNumbers = (viewport: HTMLElement) => {
		const gutter = lineNumbers.current;
		if (!gutter) return;
		const viewportRange = viewport.scrollHeight - viewport.clientHeight;
		const gutterRange = gutter.scrollHeight - gutter.clientHeight;
		gutter.scrollTop = viewportRange > 0 ? viewport.scrollTop / viewportRange * gutterRange : 0;
	};

	useLayoutEffect(() => {
		const shell = editorShell.current;
		if (!shell) return;
		const measure = () => {
			const viewport = normalBuffer.current ?? editor.current;
			if (!viewport) return;
			const style = window.getComputedStyle(viewport);
			const context = document.createElement('canvas').getContext('2d');
			if (!context) return;
			context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			const characterWidth = context.measureText('0').width;
			const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
			const nextColumns = Math.max(12, Math.floor((viewport.clientWidth - horizontalPadding) / characterWidth));
			setWrapColumns((current) => current === nextColumns ? current : nextColumns);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(shell);
		return () => observer.disconnect();
	}, [mode, isLocked]);

	useEffect(() => {
		setCursor((current) => {
			const line = Math.min(current.line, visualLines.length - 1);
			return { line, column: Math.min(current.column, visualLines[line].length - 1) };
		});
	}, [visualLines]);

	useEffect(() => {
		if (!autoFocus || isLocked) return;
		const frame = window.requestAnimationFrame(() => normalBuffer.current?.focus());
		return () => window.cancelAnimationFrame(frame);
	}, [autoFocus, isLocked, sessionKey]);

	useLayoutEffect(() => {
		if (mode !== 'normal' || isLocked) return;
		const viewport = normalBuffer.current;
		const caret = viewport?.querySelector<HTMLElement>('.vim-terminal__caret, .vim-terminal__inline-logo.is-cursor');
		if (!viewport || !caret) return;
		const viewportBounds = viewport.getBoundingClientRect();
		const caretBounds = caret.getBoundingClientRect();
		const edgeInset = 1;
		if (caretBounds.top < viewportBounds.top + edgeInset) viewport.scrollTop += caretBounds.top - viewportBounds.top - edgeInset;
		else if (caretBounds.bottom > viewportBounds.bottom - edgeInset) viewport.scrollTop += caretBounds.bottom - viewportBounds.bottom + edgeInset;
		if (caretBounds.left < viewportBounds.left) viewport.scrollLeft += caretBounds.left - viewportBounds.left;
		else if (caretBounds.right > viewportBounds.right) viewport.scrollLeft += caretBounds.right - viewportBounds.right;
		syncLineNumbers(viewport);
	}, [cursor, isLocked, mode]);

	useEffect(() => {
		const keyChanged = activeSessionKey.current !== sessionKey;
		activeSessionKey.current = sessionKey;
		if (!keyChanged) return;
		setBuffer(readVimBuffer(sessionKey, initialBuffer));
		setMode('normal');
		setCountPrefix('');
		setCursor({ line: 0, column: 0 });
		preferredColumn.current = 0;
	}, [initialBuffer, sessionKey]);

	const focusNormalBuffer = () => window.requestAnimationFrame(() => normalBuffer.current?.focus());
	const enterInsertMode = (rawIndex: number) => {
		setCountPrefix('');
		setMode('insert');
		window.requestAnimationFrame(() => {
			const field = editor.current;
			if (!field) return;
			field.focus();
			const nextCursor = Math.min(rawIndex, field.value.length);
			field.setSelectionRange(nextCursor, nextCursor);
		});
	};
	const enterCommandMode = () => {
		setCountPrefix('');
		setCommand('');
		setMode('command');
		window.requestAnimationFrame(() => commandInput.current?.focus());
	};
	const executeCommand = () => {
		const normalized = command.trim().toLowerCase();
		if (normalized === 'w' || normalized === 'wq') writeVimBuffer(sessionKey, buffer);
		if (normalized === 'q' || normalized === 'q!' || normalized === 'wq') {
			onQuit();
			return;
		}
		setMode('normal');
		focusNormalBuffer();
	};
	const handleNormalKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (/^[0-9]$/.test(event.key) && (event.key !== '0' || countPrefix)) {
			setCountPrefix(`${countPrefix}${event.key}`);
			event.preventDefault();
			return;
		}
		const cells = visualLines[cursor.line];
		const cell = cells[cursor.column];
		const count = Number.parseInt(countPrefix, 10) || 1;
		if (event.key === 'i') enterInsertMode(cell.rawIndex);
		else if (event.key === 'a') enterInsertMode(cell.rawAfter);
		else if (event.key === 'I') enterInsertMode(cells[0].rawIndex);
		else if (event.key === 'A') enterInsertMode(cells.at(-1)?.rawAfter ?? buffer.length);
		else if (event.key === ':') enterCommandMode();
		else if (event.key === 'h' || event.key === 'l') {
			const step = event.key === 'h' ? -1 : 1;
			const column = Math.max(0, Math.min(cursor.column + step * count, cells.length - 1));
			preferredColumn.current = column;
			setCursor({ line: cursor.line, column });
		} else if (event.key === 'j' || event.key === 'k') {
			const step = event.key === 'k' ? -1 : 1;
			const line = Math.max(0, Math.min(cursor.line + step * count, visualLines.length - 1));
			setCursor({ line, column: Math.min(preferredColumn.current, visualLines[line].length - 1) });
		} else {
			setCountPrefix('');
			return;
		}
		setCountPrefix('');
		event.preventDefault();
	};

	return (
		<div className={`vim-terminal${className ? ` ${className}` : ''}`}>
			{promptPath && <div className="vim-terminal__prompt" aria-hidden="true"><span>patrick@universe</span><span>{promptPath}</span></div>}
			<div ref={editorShell} className="vim-terminal__editor">
				<ol ref={lineNumbers} className="vim-terminal__lines" aria-hidden="true">
					{Array.from({ length: visualLines.length }, (_, index) => <li key={index}>{index + 1}</li>)}
				</ol>
				{(isLocked || mode !== 'insert') && (
					<div
						ref={normalBuffer}
						className="vim-terminal__buffer vim-terminal__buffer--linked"
						role="textbox"
						aria-readonly="true"
						aria-label={editableLabel}
						tabIndex={isLocked ? -1 : 0}
						autoFocus={!isLocked && autoFocus}
						onKeyDown={isLocked ? undefined : handleNormalKey}
						onScroll={(event) => {
							syncLineNumbers(event.currentTarget);
						}}
					>
						<LinkedBuffer lines={visualLines} cursor={isLocked ? null : cursor} />
					</div>
				)}
				<textarea
					ref={editor}
					className="vim-terminal__buffer"
					wrap="soft"
					value={buffer}
					hidden={isLocked || mode !== 'insert'}
					spellCheck={false}
					aria-label={editableLabel}
					onChange={(event) => setBuffer(event.target.value)}
					onScroll={(event) => {
						syncLineNumbers(event.currentTarget);
					}}
					onKeyDown={(event) => {
						if (event.key !== 'Escape') return;
						event.preventDefault();
						event.stopPropagation();
						const nextCursor = cursorForRawIndex(renderedLines, Math.max(0, event.currentTarget.selectionStart - 1));
						setCursor(nextCursor);
						preferredColumn.current = nextCursor.column;
						setMode('normal');
						focusNormalBuffer();
					}}
				/>
			</div>
			<footer className="vim-terminal__status" aria-live="polite">
				{visibleMode === 'command' ? (
					<form className="vim-terminal__command" onSubmit={(event) => { event.preventDefault(); executeCommand(); }}>
						<span aria-hidden="true">:</span>
						<input
							ref={commandInput}
							value={command}
							aria-label={`${filename} Vim command`}
							onChange={(event) => setCommand(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									executeCommand();
									return;
								}
								if (event.key !== 'Escape') return;
								event.preventDefault();
								setMode('normal');
								focusNormalBuffer();
							}}
						/>
					</form>
				) : <strong>{visibleMode === 'insert' ? insertLabel : `${normalLabel}${countPrefix ? ` ${countPrefix}` : ''}`}</strong>}
				<span>{visualLines.length}L</span>
			</footer>
		</div>
	);
}

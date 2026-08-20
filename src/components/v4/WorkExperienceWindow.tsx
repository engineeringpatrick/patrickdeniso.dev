import { useEffect, useMemo, useRef, useState } from 'react';
import { copy, type V4Language, workExperience } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';

type WorkExperienceWindowProps = {
	language: V4Language;
	onClose: () => void;
};

type VimMode = 'normal' | 'insert';

/** A deliberately small, editable Vim-like buffer — the original data remains local to the visitor. */
export default function WorkExperienceWindow({ language, onClose }: WorkExperienceWindowProps) {
	const text = copy[language].work;
	const site = copy[language].site;
	const initialBuffer = useMemo(() => workExperience[language]
		.map((role) => `${role.company}  |  ${role.dates}\n${role.description}`)
		.join('\n\n'), [language]);
	const editor = useRef<HTMLTextAreaElement>(null);
	const [buffer, setBuffer] = useState(initialBuffer);
	const [hasEdited, setHasEdited] = useState(false);
	const [mode, setMode] = useState<VimMode>('normal');
	const windowState = useWindowMode();
	const lineCount = buffer.split('\n').length;

	useEffect(() => {
		if (!hasEdited) setBuffer(initialBuffer);
	}, [hasEdited, initialBuffer]);

	const enterInsertMode = (append = false) => {
		setMode('insert');
		window.requestAnimationFrame(() => {
			const field = editor.current;
			if (!field) return;
			field.focus();
			if (append) {
				const cursor = Math.min(field.selectionStart + 1, field.value.length);
				field.setSelectionRange(cursor, cursor);
			}
		});
	};

	return (
		<section className={`v4-window v4-window--vim${windowState.windowClass}`} role="dialog" aria-modal="true" aria-labelledby="work-window-title" tabIndex={-1} autoFocus>
			<header className="v4-window__toolbar v4-window__toolbar--vim">
				<MacWindowControls
					mode={windowState.mode}
					labels={{ group: site.windowControls, close: site.close, minimize: site.minimize, maximize: site.maximize }}
					onClose={onClose}
					onMinimize={windowState.toggleMinimized}
					onMaximize={windowState.toggleMaximized}
				/>
				<p id="work-window-title">{text.filename}</p>
			</header>

			{!windowState.isMinimized && (
				<div className="vim-terminal">
					<div className="vim-terminal__prompt" aria-hidden="true">
						<span>patrick@universe</span><span>{text.promptPath}</span>
					</div>
					<div className="vim-terminal__editor">
						<ol className="vim-terminal__lines" aria-hidden="true">
							{Array.from({ length: lineCount }, (_, index) => <li key={index}>{index + 1}</li>)}
						</ol>
						<textarea
							ref={editor}
							className="vim-terminal__buffer"
							value={buffer}
							readOnly={mode === 'normal'}
							spellCheck={false}
							aria-label={text.editableLabel}
							onChange={(event) => {
								setHasEdited(true);
								setBuffer(event.target.value);
							}}
							onKeyDown={(event) => {
								if (event.key === 'Escape') {
									event.preventDefault();
									event.stopPropagation();
									setMode('normal');
									return;
								}

								if (mode !== 'normal') return;
								event.preventDefault();
								if (event.key === 'i') enterInsertMode();
								if (event.key === 'a') enterInsertMode(true);
							}}
						/>
					</div>
					<footer className="vim-terminal__status" aria-live="polite">
						<strong>{mode === 'insert' ? text.insert : text.normal}</strong>
						<span>{lineCount}L</span>
					</footer>
				</div>
			)}
		</section>
	);
}

import type { V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';
import V4LanguageSelect from './V4LanguageSelect';
import VimEditor from './VimEditor';

type VimWindowProps = {
	titleId: string;
	sessionKey: string;
	language: V4Language;
	filename: string;
	promptPath: string;
	initialBuffer: string;
	editableLabel: string;
	normalLabel: string;
	insertLabel: string;
	windowLabels: {
		group: string;
		close: string;
		minimize: string;
		maximize: string;
	};
	onClose: () => void;
	className?: string;
};

export default function VimWindow({
	titleId,
	sessionKey,
	language,
	filename,
	promptPath,
	initialBuffer,
	editableLabel,
	normalLabel,
	insertLabel,
	windowLabels,
	onClose,
	className = '',
}: VimWindowProps) {
	const windowState = useWindowMode();

	return (
		<section className={`v4-window v4-window--vim${className ? ` ${className}` : ''}${windowState.windowClass}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
			<header className="v4-window__toolbar v4-window__toolbar--vim">
				<MacWindowControls
					mode={windowState.mode}
					labels={windowLabels}
					onClose={onClose}
					onMinimize={windowState.toggleMinimized}
					onMaximize={windowState.toggleMaximized}
				/>
				<p id={titleId}>{filename}</p>
				<V4LanguageSelect language={language} />
			</header>

			{!windowState.isMinimized && (
				<VimEditor
					sessionKey={sessionKey}
					filename={filename}
					promptPath={promptPath}
					initialBuffer={initialBuffer}
					editableLabel={editableLabel}
					normalLabel={normalLabel}
					insertLabel={insertLabel}
					onQuit={onClose}
				/>
			)}
		</section>
	);
}

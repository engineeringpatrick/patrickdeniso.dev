import { ChevronLeft, ChevronRight, ExternalLink, Globe2, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { copy, type V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';

type MacBrowserWindowProps = {
	language: V4Language;
	onClose: () => void;
	address: string;
	title: string;
	children: ReactNode;
	externalHref?: string;
	externalLabel?: string;
};

/** Shared macOS browser chrome for pages that stay inside the v4 universe. */
export default function MacBrowserWindow({ language, onClose, address, title, children, externalHref, externalLabel }: MacBrowserWindowProps) {
	const text = copy[language].browser;
	const site = copy[language].site;
	const windowState = useWindowMode();

	return (
		<section className={`v4-window v4-window--browser${windowState.windowClass}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} autoFocus>
			<header className="v4-window__toolbar v4-window__toolbar--browser">
				<MacWindowControls
					mode={windowState.mode}
					labels={{ group: site.windowControls, close: site.close, minimize: site.minimize, maximize: site.maximize }}
					onClose={onClose}
					onMinimize={windowState.toggleMinimized}
					onMaximize={windowState.toggleMaximized}
				/>
				<div className="browser-toolbar">
					<div className="browser-toolbar__history" aria-label={text.historyControls}>
						<button type="button" disabled aria-label={text.back}><ChevronLeft size={14} /></button>
						<button type="button" disabled aria-label={text.forward}><ChevronRight size={14} /></button>
					</div>
					<div className="browser-toolbar__address"><Globe2 size={13} aria-hidden="true" /><span>{address}</span></div>
					{externalHref ? <a href={externalHref} target="_blank" rel="noreferrer" aria-label={externalLabel ?? text.openExternal}><ExternalLink size={13} /></a> : <span className="browser-toolbar__end" />}
				</div>
			</header>

			{!windowState.isMinimized && <>
				<div className="browser-frame">{children}</div>
				<footer className="browser-status"><RotateCw size={11} aria-hidden="true" /><span>{text.secureConnection}</span></footer>
			</>}
		</section>
	);
}

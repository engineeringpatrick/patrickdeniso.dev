import { ChevronLeft, ChevronRight, ExternalLink, Globe2, RotateCw } from 'lucide-react';
import { copy, type V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';

type BlogBrowserWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const blogUrl = 'https://blog.patrickdeniso.com/';

/** The blog stays framed inside v4 so the universe never needs to navigate away. */
export default function BlogBrowserWindow({ language, onClose }: BlogBrowserWindowProps) {
	const text = copy[language].browser;
	const site = copy[language].site;
	const windowState = useWindowMode();

	return (
		<section className={`v4-window v4-window--browser${windowState.windowClass}`} role="dialog" aria-modal="true" aria-labelledby="blog-browser-title" tabIndex={-1} autoFocus>
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
					<div className="browser-toolbar__address" id="blog-browser-title"><Globe2 size={13} aria-hidden="true" /><span>{text.address}</span></div>
					<a href={blogUrl} target="_blank" rel="noreferrer" aria-label={text.openExternal}><ExternalLink size={13} /></a>
				</div>
			</header>

			{!windowState.isMinimized && <>
				<div className="browser-frame">
					<iframe src={blogUrl} title={text.iframeTitle} referrerPolicy="strict-origin-when-cross-origin" />
				</div>
				<footer className="browser-status"><RotateCw size={11} aria-hidden="true" /><span>{text.secureConnection}</span></footer>
			</>}
		</section>
	);
}

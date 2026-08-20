import { copy, type V4Language } from '../../locales/v4';
import VimWindow from './VimWindow';

type AboutMeWindowProps = {
	language: V4Language;
	onClose: () => void;
};

export default function AboutMeWindow({ language, onClose }: AboutMeWindowProps) {
	const text = copy[language].about;
	const site = copy[language].site;

	return (
		<VimWindow
			titleId="about-window-title"
			sessionKey={`about:${language}`}
			language={language}
			filename={text.appName}
			promptPath={text.promptPath}
			initialBuffer={text.content}
			editableLabel={text.editableLabel}
			normalLabel={text.normal}
			insertLabel={text.insert}
			windowLabels={{ group: site.windowControls, close: text.close, minimize: site.minimize, maximize: site.maximize }}
			onClose={onClose}
			className="v4-window--about"
		/>
	);
}

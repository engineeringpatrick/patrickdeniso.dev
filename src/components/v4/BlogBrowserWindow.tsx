import { copy, type V4Language } from '../../locales/v4';
import MacBrowserWindow from './MacBrowserWindow';

type BlogBrowserWindowProps = {
	language: V4Language;
	onClose: () => void;
};

const blogUrl = 'https://blog.patrickdeniso.com/';

/** The blog stays framed inside v4 so the universe never needs to navigate away. */
export default function BlogBrowserWindow({ language, onClose }: BlogBrowserWindowProps) {
	const text = copy[language].browser;
	return (
		<MacBrowserWindow language={language} onClose={onClose} address={text.address} title={text.iframeTitle} externalHref={blogUrl} externalLabel={text.openExternal}>
			<iframe src={blogUrl} title={text.iframeTitle} referrerPolicy="strict-origin-when-cross-origin" />
		</MacBrowserWindow>
	);
}

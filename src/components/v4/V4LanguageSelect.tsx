import { copy, isV4Language, supportedLanguages, type V4Language } from '../../locales/v4';
import { V4_LANGUAGE_REQUEST_EVENT, type V4LanguageRequestDetail } from './v4Events';

export default function V4LanguageSelect({ language }: { language: V4Language }) {
	return (
		<label className="v4-window__toolbar-language">
			<span className="v4-window__sr-only">{copy[language].site.websiteLanguage}</span>
			<select
				className="v4-language-select"
				value={language}
				aria-label={copy[language].site.websiteLanguage}
				onChange={(event) => {
					if (!isV4Language(event.target.value)) return;
					window.dispatchEvent(new CustomEvent<V4LanguageRequestDetail>(V4_LANGUAGE_REQUEST_EVENT, {
						detail: { language: event.target.value },
					}));
				}}
			>
				{supportedLanguages.map(({ code, label }) => <option value={code} key={code}>{label}</option>)}
			</select>
		</label>
	);
}

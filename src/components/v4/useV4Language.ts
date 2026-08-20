import { useEffect, useState } from 'react';
import { isV4Language, type V4Language } from '../../locales/v4';
import { V4_LANGUAGE_CHANGE_EVENT } from './v4Events';

const currentLanguage = (): V4Language => {
	if (typeof document === 'undefined') return 'en';
	const language = document.documentElement.dataset.v4Language;
	return isV4Language(language) ? language : 'en';
};

export default function useV4Language() {
	const [language, setLanguage] = useState<V4Language>(currentLanguage);

	useEffect(() => {
		const updateLanguage = () => setLanguage(currentLanguage());
		updateLanguage();
		window.addEventListener(V4_LANGUAGE_CHANGE_EVENT, updateLanguage);
		return () => window.removeEventListener(V4_LANGUAGE_CHANGE_EVENT, updateLanguage);
	}, []);

	return language;
}

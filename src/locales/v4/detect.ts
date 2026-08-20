import { isV4Language, type V4Language } from './index';

const languageFromBrowser = (): V4Language => {
	const preferred = navigator.languages?.[0] ?? navigator.language;
	const language = preferred?.slice(0, 2).toLowerCase();
	if (isV4Language(language)) return language;

	const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	if (zone === 'Europe/Rome') return 'it';
	if (['Europe/Paris', 'Europe/Brussels', 'Europe/Monaco', 'America/Montreal'].includes(zone)) return 'fr';
	if (['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Hong_Kong', 'Asia/Macau', 'Asia/Taipei'].includes(zone)) return 'zh';
	return 'en';
};

export const detectV4Language = async (routedLanguage?: string): Promise<V4Language> => {
	if (isV4Language(routedLanguage)) return routedLanguage;

	const savedLanguage = window.localStorage.getItem('v4-language');
	if (isV4Language(savedLanguage)) return savedLanguage;

	try {
		const response = await fetch('/api/v4-language', { headers: { Accept: 'application/json' } });
		if (response.ok) {
			const result = await response.json() as { language?: unknown; located?: boolean };
			if (result.located && isV4Language(result.language)) return result.language;
		}
	} catch {
		// Fall through when location is unavailable, including local static previews.
	}
	return languageFromBrowser();
};

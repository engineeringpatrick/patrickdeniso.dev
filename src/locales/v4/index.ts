import en from './en';
import fr from './fr';
import it from './it';
import zh from './zh';
import type { V4Copy, V4Language, WorkExperience } from './types';

export type { PlanetId, V4Copy, V4Language, V4Locale, WorkExperience } from './types';

/** Add a locale by creating one file here and registering it in this object. */
export const locales = { en, it, fr, zh } as const;

export const isV4Language = (value: unknown): value is V4Language => typeof value === 'string' && value in locales;

export const copy: Record<V4Language, V4Copy> = {
	en: en.copy,
	it: it.copy,
	fr: fr.copy,
	zh: zh.copy,
};

export const workExperience: Record<V4Language, WorkExperience[]> = {
	en: en.workExperience,
	it: it.workExperience,
	fr: fr.workExperience,
	zh: zh.workExperience,
};

export const supportedLanguages = [
	{ code: 'en', label: 'English' },
	{ code: 'it', label: 'Italiano' },
	{ code: 'fr', label: 'Français' },
	{ code: 'zh', label: '中文' },
] as const;

export const languageLocales: Record<V4Language, string> = {
	en: 'en-US',
	it: 'it-IT',
	fr: 'fr-FR',
	zh: 'zh-CN',
};

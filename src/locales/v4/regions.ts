import type { V4Language } from './types';

// Cloudflare uses ISO 3166-1 alpha-2 country codes and subdivision codes.
const frenchCountries = new Set([
	'BE', 'BF', 'BI', 'BJ', 'BL', 'CD', 'CF', 'CG', 'CH', 'CI', 'CM', 'DJ', 'FR', 'GA', 'GF', 'GN', 'GP',
	'GQ', 'HT', 'KM', 'LU', 'MC', 'MF', 'MG', 'ML', 'MQ', 'NC', 'NE', 'PF', 'PM', 'RE', 'RW', 'SC', 'SN',
	'TD', 'TG', 'VU', 'WF', 'YT',
]);

const chineseRegions = new Set(['CN', 'HK', 'MO', 'SG', 'TW']);

export const languageForRegion = (country = '', regionCode = ''): V4Language => {
	const countryCode = country.toUpperCase();
	const subdivision = regionCode.toUpperCase();
	if (countryCode === 'IT') return 'it';
	if (chineseRegions.has(countryCode)) return 'zh';
	if (countryCode === 'CA') return subdivision === 'QC' ? 'fr' : 'en';
	return frenchCountries.has(countryCode) ? 'fr' : 'en';
};

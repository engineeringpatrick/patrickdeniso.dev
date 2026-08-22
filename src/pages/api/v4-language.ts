import type { APIRoute } from 'astro';
import { languageForRegion } from '../../locales/v4/regions';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
	const cf = (request as Request & { cf?: { country?: string; regionCode?: string } }).cf;
	const country = cf?.country ?? request.headers.get('cf-ipcountry') ?? '';
	const regionCode = cf?.regionCode ?? request.headers.get('cf-region-code') ?? '';
	return Response.json(
		{ language: languageForRegion(country, regionCode), located: Boolean(country) },
		{ headers: { 'Cache-Control': 'private, no-store' } },
	);
};

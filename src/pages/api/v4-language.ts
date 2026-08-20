import type { APIRoute } from 'astro';
import { languageForRegion } from '../../locales/v4/regions';

export const prerender = false;

type CloudflareLocals = {
	runtime?: {
		cf?: { country?: string; regionCode?: string };
	};
};

export const GET: APIRoute = ({ locals, request }) => {
	const cf = (locals as CloudflareLocals).runtime?.cf;
	const country = request.headers.get('cf-ipcountry') ?? cf?.country ?? '';
	const regionCode = request.headers.get('cf-region-code') ?? cf?.regionCode ?? '';
	return Response.json(
		{ language: languageForRegion(country, regionCode), located: Boolean(country) },
		{ headers: { 'Cache-Control': 'private, no-store' } },
	);
};

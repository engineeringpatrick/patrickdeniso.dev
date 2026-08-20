import type { APIRoute } from 'astro';

export const prerender = true;

const origin = 'https://patrickdeniso.dev';
const pages = [
	{ language: 'en', path: '/' },
	{ language: 'it', path: '/v/4/it/' },
	{ language: 'fr', path: '/v/4/fr/' },
	{ language: 'zh-Hans', path: '/v/4/zh/' },
] as const;

const alternates = pages
	.map(({ language, path }) => `<xhtml:link rel="alternate" hreflang="${language}" href="${origin}${path}" />`)
	.join('');
const urls = pages
	.map(({ path }) => `<url><loc>${origin}${path}</loc><xhtml:link rel="alternate" hreflang="x-default" href="${origin}/" />${alternates}</url>`)
	.join('');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;

export const GET: APIRoute = () => new Response(sitemap, {
	headers: { 'Content-Type': 'application/xml; charset=utf-8' },
});

import type { APIRoute } from 'astro';
import type { Runtime } from '@astrojs/cloudflare';

export const prerender = false;

type CommentRow = {
	id: number;
	body: string;
	created_at: number;
	city: string | null;
	region: string | null;
	country: string | null;
	device: string;
};

type CommentsRuntime = Runtime<Pick<Cloudflare.Env, 'COMMENTS_DB' | 'COMMENTS_HASH_SALT'>>['runtime'];
type CommentsDatabase = Cloudflare.Env['COMMENTS_DB'];
type CloudflareLocals = { runtime?: CommentsRuntime };

type PublicComment = {
	id: number;
	body: string;
	createdAt: string;
	location: { city: string | null; region: string | null; country: string | null };
	device: string;
};

const maxCommentLength = 500;
const maxCommentsPerHour = 5;
const minimumCommentIntervalSeconds = 20;

const json = (body: unknown, status = 200) => Response.json(body, {
	status,
	headers: { 'Cache-Control': 'private, no-store' },
});

const cleanMetadata = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 80) || null : null;

const getRequestContext = (request: Request, locals: CloudflareLocals) => {
	const cf = locals.runtime?.cf;
	const city = cleanMetadata(cf?.city);
	const region = cleanMetadata(cf?.region ?? cf?.regionCode ?? request.headers.get('cf-region-code'));
	const country = cleanMetadata(cf?.country ?? request.headers.get('cf-ipcountry'));
	const userAgent = request.headers.get('user-agent') ?? '';
	const deviceType = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : /Mobile|Android|iPhone/i.test(userAgent) ? 'Mobile' : 'Desktop';
	const browser = /Edg\//.test(userAgent) ? 'Edge' : /OPR\//.test(userAgent) ? 'Opera' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Browser';
	const operatingSystem = /iPad|iPhone|iPod/.test(userAgent) ? 'iOS' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Macintosh|Mac OS X/.test(userAgent) ? 'macOS' : /CrOS/.test(userAgent) ? 'ChromeOS' : /Linux/.test(userAgent) ? 'Linux' : '';
	return {
		location: { city, region, country },
		device: [deviceType, browser, operatingSystem].filter(Boolean).join(' · '),
	};
};

const toPublicComment = (row: CommentRow): PublicComment => ({
	id: row.id,
	body: row.body,
	createdAt: new Date(row.created_at * 1000).toISOString(),
	location: { city: row.city, region: row.region, country: row.country },
	device: row.device,
});

const visitorHash = async (request: Request, salt: string) => {
	const address = request.headers.get('cf-connecting-ip') ?? 'local-development';
	const day = new Date().toISOString().slice(0, 10);
	const bytes = new TextEncoder().encode(`${salt}:${day}:${address}`);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const getStoredComments = async (database: CommentsDatabase) => {
	const result = await database.prepare(`
		SELECT id, body, created_at, city, region, country, device
		FROM v4_comments
		ORDER BY created_at DESC, id DESC
		LIMIT 50
	`).all<CommentRow>();
	return result.results ?? [];
};

export const GET: APIRoute = async ({ locals, request }) => {
	const runtime = (locals as CloudflareLocals).runtime;
	const database = runtime?.env?.COMMENTS_DB;
	if (!database) return json({ error: 'UNAVAILABLE' }, 503);
	const comments = await getStoredComments(database);
	return json({
		comments: comments.map(toPublicComment),
		viewer: getRequestContext(request, { runtime }),
	});
};

export const POST: APIRoute = async ({ locals, request }) => {
	const runtime = (locals as CloudflareLocals).runtime;
	const database = runtime?.env?.COMMENTS_DB;
	const hashSalt = runtime?.env?.COMMENTS_HASH_SALT;
	if (!database || (import.meta.env.PROD && !hashSalt)) return json({ error: 'UNAVAILABLE' }, 503);
	let payload: { body?: unknown; acceptedPrivacy?: unknown; website?: unknown };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'INVALID_REQUEST' }, 400);
	}

	if (typeof payload.website === 'string' && payload.website.trim()) return json({ ok: true }, 201);
	const body = typeof payload.body === 'string' ? payload.body.trim() : '';
	if (!body || body.length > maxCommentLength) return json({ error: 'INVALID_COMMENT' }, 400);
	if (payload.acceptedPrivacy !== true) return json({ error: 'PRIVACY_REQUIRED' }, 400);

	const now = Math.floor(Date.now() / 1000);
	const hash = await visitorHash(request, hashSalt ?? 'patrickdeniso-v4-comments-development');
	const rate = await database.prepare(`
		SELECT COUNT(*) AS count, MAX(created_at) AS last_created_at
		FROM v4_comments
		WHERE visitor_hash = ? AND created_at > ?
	`).bind(hash, now - 3600).first<{ count: number; last_created_at: number | null }>();
	if ((rate?.count ?? 0) >= maxCommentsPerHour || (rate?.last_created_at ?? 0) > now - minimumCommentIntervalSeconds) {
		return json({ error: 'RATE_LIMIT' }, 429);
	}

	const context = getRequestContext(request, { runtime });
	const row = await database.prepare(`
		INSERT INTO v4_comments (body, created_at, city, region, country, device, visitor_hash)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		RETURNING id, body, created_at, city, region, country, device
	`).bind(body, now, context.location.city, context.location.region, context.location.country, context.device, hash).first<CommentRow>();
	if (!row) return json({ error: 'SAVE_FAILED' }, 500);

	return json({ comment: toPublicComment(row) }, 201);
};

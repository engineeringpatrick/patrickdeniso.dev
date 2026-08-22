import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { v4CommentPolicy } from '../../data/v4CommentPolicy';

export const prerender = false;

type CommentRow = {
	id: number;
	name: string | null;
	body: string;
	created_at: number;
	city: string | null;
	region: string | null;
	country: string | null;
	device: string;
	score: number;
	viewer_vote: number;
	last_vote_at: number;
};

type CommentsDatabase = Cloudflare.Env['COMMENTS_DB'];

type PublicComment = {
	id: number;
	name: string | null;
	body: string;
	createdAt: string;
	location: { city: string | null; region: string | null; country: string | null };
	device: string;
	score: number;
	viewerVote: -1 | 0 | 1;
	voteAvailableAt: string | null;
};

type PostingLimit = { remaining: number; resetAt: string | null };
type CloudflareRequest = Request & {
	cf?: { city?: string; region?: string; regionCode?: string; country?: string };
};

const voterCookieName = 'v4_voter';
const voterCookieMaxAge = 60 * 60 * 24 * 365;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const forbiddenControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const requestTooLarge = Symbol('request-too-large');

const json = (body: unknown, status = 200, headers?: Record<string, string>) => Response.json(body, {
	status,
	headers: {
		'Cache-Control': 'private, no-store',
		'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
		'Referrer-Policy': 'no-referrer',
		'X-Content-Type-Options': 'nosniff',
		'X-Robots-Tag': 'noindex, noarchive',
		...headers,
	},
});

const cleanMetadata = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 80) || null : null;
const logDatabaseError = (operation: 'read' | 'write' | 'vote', error: unknown) => {
	console.error(JSON.stringify({ event: 'v4_comments_database_error', operation, error: error instanceof Error ? error.message : String(error) }));
};

const getCookie = (request: Request, name: string) => request.headers.get('cookie')
	?.split(';')
	.map((part) => part.trim().split('='))
	.find(([key]) => key === name)
	?.slice(1)
	.join('=') ?? null;

const hashVoter = async (voterId: string) => {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(voterId));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const getExistingVoterHash = async (request: Request) => {
	const voterId = getCookie(request, voterCookieName);
	return voterId && uuidPattern.test(voterId) ? hashVoter(voterId) : null;
};

const getOrCreateVoter = async (request: Request) => {
	const existing = getCookie(request, voterCookieName);
	const voterId = existing && uuidPattern.test(existing) ? existing : crypto.randomUUID();
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
	return {
		hash: await hashVoter(voterId),
		cookie: `${voterCookieName}=${voterId}; Path=/; Max-Age=${voterCookieMaxAge}; HttpOnly; SameSite=Lax${secure}`,
	};
};

const readBoundedText = async (request: Request) => {
	if (!request.body) return '';
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let bytesRead = 0;
	let value = '';
	while (true) {
		const chunk = await reader.read();
		if (chunk.done) return value + decoder.decode();
		bytesRead += chunk.value.byteLength;
		if (bytesRead > v4CommentPolicy.maxRequestBytes) {
			await reader.cancel('Request body too large');
			return null;
		}
		value += decoder.decode(chunk.value, { stream: true });
	}
};

const readJsonObject = async (request: Request) => {
	const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';
	const contentLength = request.headers.get('content-length');
	if (contentType !== 'application/json') return null;
	if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > v4CommentPolicy.maxRequestBytes)) return requestTooLarge;
	try {
		const rawBody = await readBoundedText(request);
		if (rawBody === null) return requestTooLarge;
		const value: unknown = JSON.parse(rawBody);
		return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
	} catch {
		return null;
	}
};

const isSameOriginRequest = (request: Request) => {
	const origin = request.headers.get('origin');
	return !origin || origin === new URL(request.url).origin;
};

const getRequestContext = (request: Request) => {
	const cf = (request as CloudflareRequest).cf;
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
	name: row.name,
	body: row.body,
	createdAt: new Date(row.created_at * 1000).toISOString(),
	location: { city: row.city, region: row.region, country: row.country },
	device: row.device,
	score: row.score,
	viewerVote: row.viewer_vote === 1 ? 1 : row.viewer_vote === -1 ? -1 : 0,
	voteAvailableAt: row.last_vote_at > 0 ? new Date((row.last_vote_at + v4CommentPolicy.voteCooldownSeconds) * 1000).toISOString() : null,
});

const getPostingLimit = async (database: CommentsDatabase, now: number): Promise<PostingLimit> => {
	const recent = await database.prepare(`
		SELECT COUNT(*) AS count, MIN(created_at) AS oldest
		FROM (
			SELECT created_at
			FROM v4_comments
			WHERE created_at > ?1
			ORDER BY created_at DESC
			LIMIT ?2
		)
	`).bind(now - v4CommentPolicy.commentWindowSeconds, v4CommentPolicy.commentsPerWindow).first<{ count: number; oldest: number | null }>();
	const count = recent?.count ?? 0;
	return {
		remaining: Math.max(0, v4CommentPolicy.commentsPerWindow - count),
		resetAt: count >= v4CommentPolicy.commentsPerWindow && recent?.oldest
			? new Date((recent.oldest + v4CommentPolicy.commentWindowSeconds) * 1000).toISOString()
			: null,
	};
};

const getStoredComments = async (database: CommentsDatabase, voterHash: string | null) => {
	const result = await database.prepare(`
		SELECT
			comments.id,
			comments.name,
			comments.body,
			comments.created_at,
			comments.city,
			comments.region,
			comments.country,
			comments.device,
			COALESCE(totals.score, 0) AS score,
			COALESCE(viewer.vote, 0) AS viewer_vote,
			COALESCE(totals.last_vote_at, 0) AS last_vote_at
		FROM v4_comments AS comments
		LEFT JOIN (
			SELECT
				comment_id,
				SUM(vote) AS score,
				MAX(updated_at) AS last_vote_at
			FROM v4_comment_votes
			GROUP BY comment_id
		) AS totals ON totals.comment_id = comments.id
		LEFT JOIN v4_comment_votes AS viewer
			ON viewer.comment_id = comments.id AND viewer.voter_hash = ?1
		ORDER BY score DESC, comments.created_at DESC, comments.id DESC
		LIMIT 50
	`).bind(voterHash).all<CommentRow>();
	return result.results ?? [];
};

const getVoteCounts = async (database: CommentsDatabase, commentId: number, voterHash: string) => database.prepare(`
	SELECT
		COALESCE(SUM(vote), 0) AS score,
		COALESCE(MAX(CASE WHEN voter_hash = ?1 THEN vote END), 0) AS viewer_vote
	FROM v4_comment_votes
	WHERE comment_id = ?2
`).bind(voterHash, commentId).first<{ score: number; viewer_vote: number }>();

export const GET: APIRoute = async ({ request }) => {
	const database = env.COMMENTS_DB;
	if (!database) return json({ error: 'UNAVAILABLE' }, 503);
	try {
		const now = Math.floor(Date.now() / 1000);
		const voterHash = await getExistingVoterHash(request);
		const [comments, posting] = await Promise.all([getStoredComments(database, voterHash), getPostingLimit(database, now)]);
		return json({ comments: comments.map(toPublicComment), posting });
	} catch (error) {
		logDatabaseError('read', error);
		return json({ error: 'UNAVAILABLE' }, 503);
	}
};

export const POST: APIRoute = async ({ request }) => {
	const database = env.COMMENTS_DB;
	if (!database) return json({ error: 'UNAVAILABLE' }, 503);
	if (!isSameOriginRequest(request)) return json({ error: 'FORBIDDEN' }, 403);
	const payload = await readJsonObject(request);
	if (payload === requestTooLarge) return json({ error: 'REQUEST_TOO_LARGE' }, 413);
	if (!payload) return json({ error: 'INVALID_REQUEST' }, 400);

	if (typeof payload.website === 'string' && payload.website.trim()) return json({ ok: true }, 201);
	const name = typeof payload.name === 'string' ? payload.name.trim().replace(/\s+/g, ' ') : '';
	const body = typeof payload.body === 'string' ? payload.body.replace(/\r\n?/g, '\n').trim() : '';
	if (name.length > v4CommentPolicy.maxNameLength || forbiddenControlCharacters.test(name)) return json({ error: 'INVALID_NAME' }, 400);
	if (!body || body.length > v4CommentPolicy.maxCommentLength || forbiddenControlCharacters.test(body)) return json({ error: 'INVALID_COMMENT' }, 400);

	try {
		const now = Math.floor(Date.now() / 1000);
		const context = getRequestContext(request);
		const row = await database.prepare(`
			INSERT INTO v4_comments (name, body, created_at, city, region, country, device)
			SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
			WHERE (
				SELECT COUNT(*)
				FROM v4_comments
				WHERE created_at > ?8
			) < ?9
			RETURNING id, name, body, created_at, city, region, country, device,
				0 AS score, 0 AS viewer_vote, 0 AS last_vote_at
		`).bind(
			name || null,
			body,
			now,
			context.location.city,
			context.location.region,
			context.location.country,
			context.device,
			now - v4CommentPolicy.commentWindowSeconds,
			v4CommentPolicy.commentsPerWindow,
		).first<CommentRow>();
		const posting = await getPostingLimit(database, now);
		if (!row) {
			const retryAfter = posting.resetAt ? Math.max(1, Math.ceil((Date.parse(posting.resetAt) - Date.now()) / 1000)) : v4CommentPolicy.commentWindowSeconds;
			return json({ error: 'RATE_LIMITED', posting }, 429, { 'Retry-After': String(retryAfter) });
		}

		return json({ comment: toPublicComment(row), posting }, 201);
	} catch (error) {
		logDatabaseError('write', error);
		return json({ error: 'UNAVAILABLE' }, 503);
	}
};

export const PUT: APIRoute = async ({ request }) => {
	const database = env.COMMENTS_DB;
	if (!database) return json({ error: 'UNAVAILABLE' }, 503);
	if (!isSameOriginRequest(request)) return json({ error: 'FORBIDDEN' }, 403);
	const payload = await readJsonObject(request);
	if (payload === requestTooLarge) return json({ error: 'REQUEST_TOO_LARGE' }, 413);
	if (!payload) return json({ error: 'INVALID_REQUEST' }, 400);
	const commentId = payload.commentId;
	const vote = payload.vote;
	if (typeof commentId !== 'number' || !Number.isSafeInteger(commentId) || commentId < 1 || (vote !== 1 && vote !== -1)) return json({ error: 'INVALID_VOTE' }, 400);

	try {
		const comment = await database.prepare('SELECT id FROM v4_comments WHERE id = ?1').bind(commentId).first<{ id: number }>();
		if (!comment) return json({ error: 'NOT_FOUND' }, 404);
		const voter = await getOrCreateVoter(request);
		const now = Math.floor(Date.now() / 1000);
		const savedVote = await database.prepare(`
			INSERT INTO v4_comment_votes (comment_id, voter_hash, vote, updated_at)
			SELECT ?1, ?2, ?3, ?4
			WHERE COALESCE((
				SELECT MAX(updated_at)
				FROM v4_comment_votes
				WHERE comment_id = ?1
			), 0) <= ?5
			ON CONFLICT (comment_id, voter_hash) DO UPDATE SET
				vote = excluded.vote,
				updated_at = excluded.updated_at
			WHERE COALESCE((
				SELECT MAX(updated_at)
				FROM v4_comment_votes
				WHERE comment_id = ?1
			), 0) <= ?5
			RETURNING comment_id
		`).bind(commentId, voter.hash, vote, now, now - v4CommentPolicy.voteCooldownSeconds).first<{ comment_id: number }>();
		if (!savedVote) {
			const latestVote = await database.prepare('SELECT MAX(updated_at) AS updated_at FROM v4_comment_votes WHERE comment_id = ?1')
				.bind(commentId)
				.first<{ updated_at: number | null }>();
			const voteAvailableAt = new Date(((latestVote?.updated_at ?? now) + v4CommentPolicy.voteCooldownSeconds) * 1000).toISOString();
			const retryAfter = Math.max(1, Math.ceil((Date.parse(voteAvailableAt) - Date.now()) / 1000));
			return json({ error: 'RATE_LIMITED', commentId, voteAvailableAt }, 429, { 'Retry-After': String(retryAfter), 'Set-Cookie': voter.cookie });
		}
		const counts = await getVoteCounts(database, commentId, voter.hash);
		if (!counts) return json({ error: 'SAVE_FAILED' }, 500);
		return json({
			commentId,
			score: counts.score ?? 0,
			viewerVote: counts.viewer_vote === 1 ? 1 : -1,
			voteAvailableAt: new Date((now + v4CommentPolicy.voteCooldownSeconds) * 1000).toISOString(),
		}, 200, { 'Set-Cookie': voter.cookie });
	} catch (error) {
		logDatabaseError('vote', error);
		return json({ error: 'UNAVAILABLE' }, 503);
	}
};

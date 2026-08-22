import { isV4Language, type PlanetId, type V4Language } from '../../locales/v4';

export type V4RoomId = PlanetId | 'about';

export type V4Route = {
	language: V4Language;
	room: V4RoomId | null;
	collectionSlug: string | null;
	photoId: string | null;
};

export const v4RoomIds = ['work', 'posts', 'photos', 'comments', 'about'] as const satisfies readonly V4RoomId[];
const roomIds = new Set<V4RoomId>(v4RoomIds);
const roomFromSegment = (segment: string): V4RoomId | null => {
	if (segment === 'guestbook') return 'comments';
	return roomIds.has(segment as V4RoomId) ? segment as V4RoomId : null;
};
const safelyDecode = (segment: string) => {
	try { return decodeURIComponent(segment); } catch { return segment; }
};

export const parseV4Path = (pathname: string): V4Route | null => {
	const segments = pathname.split('/').filter(Boolean);
	const isLegacyV4Path = segments[0] === 'v' && segments[1] === '4' && isV4Language(segments[2]);
	const hasLanguagePrefix = !isLegacyV4Path && isV4Language(segments[0]) && segments[0] !== 'en';
	if (segments[0] === 'en' || (segments[0] === 'v' && segments[1] === '4' && !isLegacyV4Path)) return null;
	const language = isLegacyV4Path ? segments[2] as V4Language : hasLanguagePrefix ? segments[0] as V4Language : 'en';
	const roomOffset = isLegacyV4Path ? 3 : hasLanguagePrefix ? 1 : 0;
	const roomSegment = segments[roomOffset];
	if (!roomSegment) return segments.length === roomOffset ? { language, room: null, collectionSlug: null, photoId: null } : null;
	const room = roomFromSegment(roomSegment);
	if (!room) return null;
	if (room !== 'photos') return segments.length === roomOffset + 1 ? { language, room, collectionSlug: null, photoId: null } : null;
	if (segments.length > roomOffset + 3) return null;
	return {
		language,
		room,
		collectionSlug: segments[roomOffset + 1] ? safelyDecode(segments[roomOffset + 1]) : null,
		photoId: segments[roomOffset + 2] ? safelyDecode(segments[roomOffset + 2]) : null,
	};
};

export const v4Path = (language: V4Language, room: V4RoomId | null = null, collectionSlug: string | null = null, photoId: string | null = null) => {
	const segments: string[] = language === 'en' ? [] : [language];
	if (room) segments.push(room === 'comments' ? 'guestbook' : room);
	if (room === 'photos' && collectionSlug) segments.push(encodeURIComponent(collectionSlug));
	if (room === 'photos' && collectionSlug && photoId) segments.push(encodeURIComponent(photoId));
	return segments.length ? `/${segments.join('/')}/` : '/';
};

export const pushV4Path = (path: string) => {
	if (window.location.pathname !== path) window.history.pushState(null, '', path);
};

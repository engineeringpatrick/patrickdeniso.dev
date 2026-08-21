import type { V4Language } from '../../locales/v4';
import { photoCollections } from './v4Content';
import { v4Path, v4RoomIds, type V4RoomId } from './v4Routes';

export type V4StaticTarget = {
	room: V4RoomId;
	collectionSlug?: string;
	photoId?: string;
};

const roomTargets: V4StaticTarget[] = v4RoomIds.map((room) => ({ room }));
const photoTargets: V4StaticTarget[] = photoCollections.flatMap((collection) => [
	{ room: 'photos', collectionSlug: collection.slug },
	...collection.photos.map((photo) => ({ room: 'photos' as const, collectionSlug: collection.slug, photoId: photo.id })),
]);

/** Every shareable v4 destination, shared by clean URLs and legacy redirects. */
export const v4StaticTargets = [...roomTargets, ...photoTargets] as const;

export const v4TargetPath = (language: V4Language, target: V4StaticTarget) => (
	v4Path(language, target.room, target.collectionSlug, target.photoId)
);

export const v4TargetSuffix = (target: V4StaticTarget) => v4TargetPath('en', target).slice(1, -1);

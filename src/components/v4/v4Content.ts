export type { PlanetId, V4Language } from '../../locales/v4';

export type PhotoMetadata = {
	width: number;
	height: number;
	bytes: number;
	date?: string;
	location?: string;
	camera?: string;
};
export type Photo = { id: string; src: string; thumbnail: string; metadata: PhotoMetadata; caption?: string };
export type PhotoCollection = { slug: string; title: string; photos: Photo[] };

// Collections and photos are generated from public/photos/v4 at dev/build time.
// This lets you add, remove, or move image files without changing application code.
export { photoCollections } from '../../generated/v4PhotoManifest';

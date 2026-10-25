import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readCaptureDate } from './v4-capture-date.mjs';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const photosDirectory = join(projectRoot, 'public', 'photos', 'v4');
const thumbnailsDirectory = join(projectRoot, 'public', 'photos', 'v4-thumbnails');
const metadataDirectory = join(projectRoot, 'src', 'data', 'v4-photo-metadata');
const manifestPath = join(projectRoot, 'src', 'generated', 'v4PhotoManifest.ts');
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const filenameOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const expectedThumbnailPaths = new Set();

const displayName = (slug) => slug
	.split('-')
	.map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : word)
	.join(' ');

const publicPath = (...parts) => `/photos/v4/${parts.map(encodeURIComponent).join('/')}`;
const thumbnailPublicPath = (...parts) => `/photos/v4-thumbnails/${parts.map(encodeURIComponent).join('/')}`;

const createThumbnail = async (folder, filename) => {
	const sourcePath = join(photosDirectory, folder, filename);
	const thumbnailName = `${filename}.webp`;
	const destinationDirectory = join(thumbnailsDirectory, folder);
	const destinationPath = join(destinationDirectory, thumbnailName);
	expectedThumbnailPaths.add(destinationPath);
	const [sourceInfo, destinationInfo] = await Promise.all([
		stat(sourcePath),
		stat(destinationPath).catch(() => null),
	]);

	if (!destinationInfo || destinationInfo.mtimeMs < sourceInfo.mtimeMs) {
		await mkdir(destinationDirectory, { recursive: true });
		const temporaryPath = `${destinationPath}.${process.pid}.webp`;
		await sharp(sourcePath)
			.rotate()
			.resize(480, 480, { fit: 'cover', withoutEnlargement: true })
			.webp({ quality: 72, effort: 4 })
			.toFile(temporaryPath);
		await rename(temporaryPath, destinationPath);
	}

	const sourceMetadata = await sharp(sourcePath).metadata();
	const capturedAt = readCaptureDate(sourceMetadata.exif);
	return {
		thumbnail: thumbnailPublicPath(folder, thumbnailName),
		metadata: {
			width: sourceMetadata.width ?? 0,
			height: sourceMetadata.height ?? 0,
			bytes: sourceInfo.size,
			...(capturedAt ? { date: capturedAt } : {}),
		},
	};
};

const readPhotoMetadata = async (folder, filename) => {
	const metadataPath = join(metadataDirectory, folder, `${filename}.json`);
	const source = await readFile(metadataPath, 'utf8').catch((error) => {
		if (error?.code === 'ENOENT') return null;
		throw error;
	});
	if (!source) return {};
	const parsed = JSON.parse(source);
	return Object.fromEntries(['date', 'location', 'camera']
		.filter((key) => typeof parsed[key] === 'string' && parsed[key].trim())
		.map((key) => [key, parsed[key].trim()]));
};

const folders = await readdir(photosDirectory, { withFileTypes: true });
const collections = await Promise.all(
	folders
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
		.map(async (folder) => {
			const files = await readdir(join(photosDirectory, folder.name), { withFileTypes: true });
			const photos = files
				.filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
				.map((entry) => entry.name)
				.map(async (filename) => {
					const captionPath = join(photosDirectory, folder.name, `${basename(filename, extname(filename))}.txt`);
					const [caption, thumbnail, customMetadata] = await Promise.all([
						readFile(captionPath, 'utf8').then((value) => value.trim()).catch(() => ''),
						createThumbnail(folder.name, filename),
						readPhotoMetadata(folder.name, filename),
					]);
					return {
						id: filename,
						src: publicPath(folder.name, filename),
						thumbnail: thumbnail.thumbnail,
						metadata: { ...thumbnail.metadata, ...customMetadata },
						...(caption ? { caption } : {}),
					};
				});

			const resolvedPhotos = await Promise.all(photos);
			resolvedPhotos.sort((left, right) => {
				if (left.metadata.date !== right.metadata.date) {
					if (!left.metadata.date) return 1;
					if (!right.metadata.date) return -1;
					return left.metadata.date < right.metadata.date ? -1 : 1;
				}
				return filenameOrder.compare(left.id, right.id);
			});
			return { slug: folder.name, title: displayName(folder.name), photos: resolvedPhotos };
		}),
);

const earliestCapture = (collection) => collection.photos.find((photo) => photo.metadata.date)?.metadata.date ?? '';
collections.sort((left, right) => {
	const leftDate = earliestCapture(left);
	const rightDate = earliestCapture(right);
	if (leftDate !== rightDate) {
		if (!leftDate) return 1;
		if (!rightDate) return -1;
		return leftDate < rightDate ? -1 : 1;
	}
	return filenameOrder.compare(left.slug, right.slug);
});

// Drop thumbnails for photos and folders that are no longer in public/photos/v4.
const pruneThumbnails = async (directory) => {
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (error?.code === 'ENOENT') return;
		throw error;
	}

	await Promise.all(entries.map(async (entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			await pruneThumbnails(path);
			const remaining = await readdir(path).catch(() => []);
			if (remaining.length === 0) await rm(path, { recursive: true, force: true });
			return;
		}
		if (!expectedThumbnailPaths.has(path)) await rm(path, { force: true });
	}));
};

await pruneThumbnails(thumbnailsDirectory);

const source = `// Generated by scripts/generate-v4-photo-manifest.mjs. Do not edit by hand.\nimport type { PhotoCollection } from '../components/v4/v4Content';\n\nexport const photoCollections: PhotoCollection[] = ${JSON.stringify(collections, null, '\t')};\n`;
await mkdir(resolve(manifestPath, '..'), { recursive: true });
await writeFile(manifestPath, source);

console.log(`Generated ${relative(projectRoot, manifestPath)} (${collections.length} collections).`);

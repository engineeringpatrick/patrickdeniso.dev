import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import sharp from 'sharp';

const photosDirectory = join(process.cwd(), 'public', 'photos', 'v4');
const statePath = join(process.cwd(), 'src', 'data', 'v4-photo-optimization.json');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const state = JSON.parse(await readFile(statePath, 'utf8').catch(() => '{}'));

const digest = async (path) => {
	const hash = createHash('sha256');
	hash.update(await readFile(path));
	return hash.digest('hex');
};

const optimize = async (sourcePath) => {
	const extension = extname(sourcePath).toLowerCase();
	if (!supportedExtensions.has(extension)) return 0;
	const key = relative(photosDirectory, sourcePath);
	const sourceDigest = await digest(sourcePath);
	if (state[key] === sourceDigest) return 0;

	const before = await stat(sourcePath);
	const temporaryPath = `${sourcePath}.${process.pid}.optimized`;
	const image = sharp(sourcePath)
		.rotate()
		.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });

	if (extension === '.png') {
		await image.png({ palette: true, quality: 90, effort: 8, dither: 0.6 }).toFile(temporaryPath);
	} else if (extension === '.webp') {
		await image.webp({ quality: 84, effort: 5 }).toFile(temporaryPath);
	} else {
		await image.jpeg({ quality: 84, mozjpeg: true, progressive: true }).toFile(temporaryPath);
	}

	const after = await stat(temporaryPath);
	if (after.size >= before.size) {
		await unlink(temporaryPath);
		state[key] = sourceDigest;
		return 0;
	}
	await rename(temporaryPath, sourcePath);
	state[key] = await digest(sourcePath);
	return before.size - after.size;
};

const walk = async (directory) => {
	let saved = 0;
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) saved += await walk(path);
		else saved += await optimize(path);
	}
	return saved;
};

const saved = await walk(photosDirectory);
await mkdir(join(statePath, '..'), { recursive: true });
await writeFile(statePath, `${JSON.stringify(state, null, '\t')}\n`);
console.log(`Optimized public photos; saved ${(saved / 1024 / 1024).toFixed(2)} MB.`);

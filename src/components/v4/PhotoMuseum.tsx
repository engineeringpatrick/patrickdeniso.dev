import {
	ChevronLeft,
	ChevronRight,
	Folder,
	Grid2X2,
	Image,
	List,
	Search,
} from 'lucide-react';
import { GridList, GridListItem } from 'react-aria-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { copy, languageLocales, type V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';
import { photoCollections, type PhotoCollection } from './v4Content';
import { parseV4Path, pushV4Path, v4Path } from './v4Routes';

type PhotoMuseumProps = {
	language: V4Language;
	onClose: () => void;
};

type ViewMode = 'grid' | 'list';

const byteUnits = ['B', 'KB', 'MB', 'GB'];
const dateFormatters = Object.fromEntries(
	Object.entries(languageLocales).map(([language, locale]) => [language, new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })]),
) as Record<V4Language, Intl.DateTimeFormat>;

const formatBytes = (bytes: number) => {
	if (!Number.isFinite(bytes) || bytes < 1) return '—';
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), byteUnits.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${byteUnits[exponent]}`;
};

const formatDate = (value: string | undefined, language: V4Language, fallback: string) => {
	if (!value) return fallback;
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
	return Number.isNaN(date.valueOf()) ? value : dateFormatters[language].format(date);
};

const photoStateFromPath = () => {
	if (typeof window === 'undefined') return { collectionSlug: null, photoIndex: null };
	const route = parseV4Path(window.location.pathname);
	if (route?.room !== 'photos' || !route.collectionSlug) return { collectionSlug: null, photoIndex: null };
	const collection = photoCollections.find((item) => item.slug === route.collectionSlug);
	if (!collection) return { collectionSlug: null, photoIndex: null };
	const photoIndex = route.photoId ? collection.photos.findIndex((photo) => photo.id === route.photoId) : -1;
	return { collectionSlug: collection.slug, photoIndex: photoIndex >= 0 ? photoIndex : null };
};

export default function PhotoMuseum({ language, onClose }: PhotoMuseumProps) {
	const [initialPhotoState] = useState(photoStateFromPath);
	const [currentCollectionSlug, setCurrentCollectionSlug] = useState<string | null>(initialPhotoState.collectionSlug);
	const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(initialPhotoState.collectionSlug);
	const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(initialPhotoState.photoIndex);
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const [query, setQuery] = useState('');
	const windowState = useWindowMode();
	const text = copy[language].photos;
	const site = copy[language].site;
	const collection = useMemo(
		() => photoCollections.find((item) => item.slug === currentCollectionSlug) ?? null,
		[currentCollectionSlug],
	);
	const activePhoto = selectedPhotoIndex === null ? null : collection?.photos[selectedPhotoIndex] ?? null;
	const photoItems = useMemo(() => collection?.photos.map((photo, index) => ({ id: String(index), photo })) ?? [], [collection]);
	const selectedPhotoKeys = useMemo(() => selectedPhotoIndex === null ? new Set<string>() : new Set([String(selectedPhotoIndex)]), [selectedPhotoIndex]);
	const selectedCollectionKeys = useMemo(() => selectedCollectionSlug ? new Set([selectedCollectionSlug]) : new Set<string>(), [selectedCollectionSlug]);
	const collectionTitle = useCallback((item: PhotoCollection) => text.collections[item.slug] ?? item.title, [text.collections]);
	const matchingCollections = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase(languageLocales[language]);
		if (!normalizedQuery) return photoCollections;
		return photoCollections.filter((item) => collectionTitle(item).toLocaleLowerCase(languageLocales[language]).includes(normalizedQuery)
			|| item.photos.some((photo) => photo.id.toLocaleLowerCase(languageLocales[language]).includes(normalizedQuery)));
	}, [collectionTitle, language, query]);

	const showPhotoRoute = useCallback((nextCollection: PhotoCollection | null, photoIndex: number | null, updateUrl = true) => {
		setCurrentCollectionSlug(nextCollection?.slug ?? null);
		setSelectedCollectionSlug(nextCollection?.slug ?? null);
		setSelectedPhotoIndex(photoIndex);
		if (updateUrl) pushV4Path(v4Path(language, 'photos', nextCollection?.slug, photoIndex === null ? null : nextCollection?.photos[photoIndex]?.id));
	}, [language]);
	const openCollection = (nextCollection: PhotoCollection) => {
		showPhotoRoute(nextCollection, null);
		setQuery('');
	};
	const openCollectionBySlug = (slug: string | null) => {
		if (!slug) return;
		const nextCollection = matchingCollections.find((item) => item.slug === slug);
		if (nextCollection) openCollection(nextCollection);
	};

	const goToArchive = () => {
		showPhotoRoute(null, null);
	};
	const closePhoto = useCallback(() => {
		if (collection) showPhotoRoute(collection, null);
	}, [collection, showPhotoRoute]);
	const openPhoto = useCallback((index: number) => {
		if (collection?.photos[index]) showPhotoRoute(collection, index);
	}, [collection, showPhotoRoute]);

	const photoCount = collection?.photos.length ?? 0;
	const isViewingPhoto = selectedPhotoIndex !== null && collection !== null;
	const step = useCallback((direction: -1 | 1) => {
		if (!photoCount || !collection) return;
		const nextIndex = selectedPhotoIndex === null ? 0 : (selectedPhotoIndex + direction + photoCount) % photoCount;
		showPhotoRoute(collection, nextIndex);
	}, [collection, photoCount, selectedPhotoIndex, showPhotoRoute]);

	useEffect(() => {
		const syncPhotoFromUrl = () => {
			const next = photoStateFromPath();
			const nextCollection = next.collectionSlug ? photoCollections.find((item) => item.slug === next.collectionSlug) ?? null : null;
			showPhotoRoute(nextCollection, next.photoIndex, false);
		};
		window.addEventListener('popstate', syncPhotoFromUrl);
		return () => window.removeEventListener('popstate', syncPhotoFromUrl);
	}, [showPhotoRoute]);

	useEffect(() => {
		if (!isViewingPhoto) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Escape') return;
			event.preventDefault();
			event.stopPropagation();
			if (event.key === 'ArrowLeft') step(-1);
			else if (event.key === 'ArrowRight') step(1);
			else closePhoto();
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [closePhoto, isViewingPhoto, step]);

	const folderName = collection ? collectionTitle(collection) : text.title;

	return (
		<section
			className={`v4-window v4-window--museum${windowState.windowClass}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="museum-window-title"
			tabIndex={-1}
			autoFocus
		>
			<header className="v4-window__toolbar v4-window__toolbar--finder">
				<MacWindowControls
					mode={windowState.mode}
					labels={{ group: site.windowControls, close: text.close, minimize: site.minimize, maximize: site.maximize }}
					onClose={onClose}
					onMinimize={windowState.toggleMinimized}
					onMaximize={windowState.toggleMaximized}
				/>
				<div className="finder-toolbar" aria-label={text.toolbar}>
					<button className="finder-toolbar__back" type="button" aria-label={text.back} disabled={!collection && !activePhoto} onClick={activePhoto ? closePhoto : goToArchive}>
						<ChevronLeft size={15} aria-hidden="true" />
					</button>
					<p>{text.appName}</p>
					<div className="finder-toolbar__actions">
						<div className="finder-toolbar__views" aria-label={text.viewOptions}>
							<button type="button" aria-label={text.gridView} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><Grid2X2 size={14} aria-hidden="true" /></button>
							<button type="button" aria-label={text.listView} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List size={15} aria-hidden="true" /></button>
						</div>
						<label className="finder-toolbar__search">
							<Search size={13} aria-hidden="true" />
							<span className="v4-window__sr-only">{text.searchCollections}</span>
							<input
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setSelectedCollectionSlug(null);
								}}
								placeholder={text.searchCollections}
							/>
						</label>
					</div>
				</div>
			</header>

			{!windowState.isMinimized && (
				<div className="finder-shell">
					<aside className="finder-sidebar" aria-label={text.sidebar}>
						<p className="finder-sidebar__heading">{text.library}</p>
						<button className={!collection ? 'is-current' : ''} type="button" onClick={goToArchive}>
							<Image size={15} aria-hidden="true" /> {text.title}
						</button>
						<p className="finder-sidebar__heading">{text.collectionsLabel}</p>
						<div className="finder-sidebar__collections">
							{photoCollections.map((item) => (
								<button className={collection?.slug === item.slug ? 'is-current' : ''} type="button" key={item.slug} onClick={() => openCollection(item)}>
									<Folder size={15} aria-hidden="true" /> {collectionTitle(item)}
								</button>
							))}
						</div>
					</aside>

					{activePhoto && collection && selectedPhotoIndex !== null ? (
						<div className="finder-viewer">
							<header className="finder-viewer__header">
								<div><p className="v4-window__eyebrow">{collectionTitle(collection)}</p><h2 id="museum-window-title">{activePhoto.id}</h2></div>
								<p>{selectedPhotoIndex + 1} {text.of} {collection.photos.length}</p>
							</header>
							<div className="finder-viewer__body">
								<div className="finder-viewer__main">
									<div className="finder-viewer__stage">
										<button className="finder-viewer__step finder-viewer__step--previous" type="button" aria-label={text.previous} onClick={() => step(-1)}><ChevronLeft aria-hidden="true" /></button>
										<figure className={`finder-viewer__frame${activePhoto.caption ? ' has-caption' : ''}`}>
											<img src={activePhoto.src} alt={`${text.photoAlt} ${selectedPhotoIndex + 1}`} fetchPriority="high" decoding="async" />
											{activePhoto.caption ? <figcaption>{activePhoto.caption}</figcaption> : null}
										</figure>
										<button className="finder-viewer__step finder-viewer__step--next" type="button" aria-label={text.next} onClick={() => step(1)}><ChevronRight aria-hidden="true" /></button>
									</div>
									<div className="finder-viewer__filmstrip" aria-label={`${collectionTitle(collection)} ${text.photographs}`}>
										{collection.photos.map((photo, index) => (
											<button className={index === selectedPhotoIndex ? 'is-active' : ''} type="button" key={photo.src} aria-label={`${text.openPhotograph}: ${photo.id}`} onClick={() => openPhoto(index)}>
												<img src={photo.thumbnail} alt="" loading="lazy" decoding="async" />
											</button>
										))}
									</div>
								</div>
								<aside className="finder-info" aria-label={text.metadata}>
									<h3>{text.metadata}</h3>
									<dl>
										<div><dt>{text.fileName}</dt><dd>{activePhoto.id}</dd></div>
										<div><dt>{text.collection}</dt><dd>{collectionTitle(collection)}</dd></div>
										<div><dt>{text.dimensions}</dt><dd>{activePhoto.metadata.width} × {activePhoto.metadata.height}px</dd></div>
										<div><dt>{text.fileSize}</dt><dd>{formatBytes(activePhoto.metadata.bytes)}</dd></div>
										<div><dt>{text.dateTaken}</dt><dd>{formatDate(activePhoto.metadata.date, language, text.notSet)}</dd></div>
										<div><dt>{text.location}</dt><dd>{activePhoto.metadata.location ?? collectionTitle(collection)}</dd></div>
										<div><dt>{text.camera}</dt><dd>{activePhoto.metadata.camera ?? text.notSet}</dd></div>
									</dl>
								</aside>
							</div>
						</div>
					) : (
						<main className="finder-main">
							<header className="finder-main__header">
								<div>
									<p className="v4-window__eyebrow">{collection ? text.collection : text.eyebrow}</p>
									<h2 id="museum-window-title">{folderName}</h2>
								</div>
								<p>{collection ? `${collection.photos.length} ${text.photographs}` : `${matchingCollections.length} ${text.collectionsCount}`}</p>
							</header>

							{collection ? (
								<GridList
									className={`finder-grid finder-grid--photos finder-grid--${viewMode}`}
									aria-label={`${collectionTitle(collection)} ${text.photographs}`}
									layout="grid"
									selectionMode="single"
									selectedKeys={selectedPhotoKeys}
									onSelectionChange={(keys) => {
										if (keys === 'all') return;
										const nextKey = keys.values().next().value;
										if (typeof nextKey === 'string') openPhoto(Number(nextKey));
									}}
									onAction={(key) => openPhoto(Number(key))}
									items={photoItems}
								>
									{(item) => (
										<GridListItem id={item.id} textValue={item.photo.id}>
											<img src={item.photo.thumbnail} alt="" loading="lazy" decoding="async" />
											<span>{item.photo.id}</span>
										</GridListItem>
									)}
								</GridList>
							) : (
								<div
									className="finder-grid-host"
									onKeyDown={(event) => {
										if (event.key === 'Enter') openCollectionBySlug(selectedCollectionSlug);
									}}
								>
									<GridList
										className={`finder-grid finder-grid--collections finder-grid--${viewMode}`}
										aria-label={text.title}
										layout="grid"
										selectionMode="single"
										selectedKeys={selectedCollectionKeys}
										onSelectionChange={(keys) => {
											if (keys === 'all') return;
											const nextKey = keys.values().next().value;
											if (typeof nextKey === 'string') setSelectedCollectionSlug(nextKey);
										}}
										items={matchingCollections}
									>
										{(item) => (
											<GridListItem
												id={item.slug}
												textValue={collectionTitle(item)}
												onDoubleClick={() => openCollection(item)}
												onPointerUp={(event) => {
													if (event.pointerType !== 'mouse') openCollection(item);
												}}
											>
												<img src={item.photos[0]?.thumbnail} alt="" loading="lazy" decoding="async" />
												<span className="finder-grid__item-label"><strong>{collectionTitle(item)}</strong><small>{item.photos.length} {text.files}</small></span>
											</GridListItem>
										)}
									</GridList>
								</div>
							)}
						</main>
					)}
				</div>
			)}
		</section>
	);
}

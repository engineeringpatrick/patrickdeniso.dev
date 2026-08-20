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
import { useEffect, useMemo, useState } from 'react';
import { copy, type V4Language } from '../../locales/v4';
import MacWindowControls, { useWindowMode } from './MacWindowControls';
import { photoCollections, type PhotoCollection } from './v4Content';

type PhotoMuseumProps = {
	language: V4Language;
	onClose: () => void;
};

type ViewMode = 'grid' | 'list';

const localeForLanguage: Record<V4Language, string> = { en: 'en-US', it: 'it-IT', fr: 'fr-FR', zh: 'zh-CN' };

const formatBytes = (bytes: number) => {
	if (!Number.isFinite(bytes) || bytes < 1) return '—';
	const units = ['B', 'KB', 'MB', 'GB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDate = (value: string | undefined, language: V4Language, fallback: string) => {
	if (!value) return fallback;
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
	return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(localeForLanguage[language], { dateStyle: 'medium' }).format(date);
};

export default function PhotoMuseum({ language, onClose }: PhotoMuseumProps) {
	const [currentCollectionSlug, setCurrentCollectionSlug] = useState<string | null>(null);
	const [selectedCollectionSlug, setSelectedCollectionSlug] = useState<string | null>(null);
	const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
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
	const collectionTitle = (item: PhotoCollection) => text.collections[item.slug] ?? item.title;
	const matchingCollections = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return photoCollections;
		return photoCollections.filter((item) => collectionTitle(item).toLocaleLowerCase().includes(normalizedQuery));
	}, [query, text.collections]);

	const openCollection = (nextCollection: PhotoCollection) => {
		setCurrentCollectionSlug(nextCollection.slug);
		setSelectedCollectionSlug(nextCollection.slug);
		setSelectedPhotoIndex(null);
		setQuery('');
	};

	const goToArchive = () => {
		setCurrentCollectionSlug(null);
		setSelectedPhotoIndex(null);
	};

	const step = (direction: -1 | 1) => {
		if (!collection || selectedPhotoIndex === null) return;
		setSelectedPhotoIndex((current) => current === null ? 0 : (current + direction + collection.photos.length) % collection.photos.length);
	};

	useEffect(() => {
		if (!activePhoto || !collection) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') step(-1);
			if (event.key === 'ArrowRight') step(1);
			if (event.key === 'Escape') setSelectedPhotoIndex(null);
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [activePhoto, collection, selectedPhotoIndex]);

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
					<button className="finder-toolbar__back" type="button" aria-label={text.back} disabled={!collection && !activePhoto} onClick={activePhoto ? () => setSelectedPhotoIndex(null) : goToArchive}>
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
							<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchCollections} />
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
										<figure className="finder-viewer__frame">
											<img src={activePhoto.src} alt={`${text.photoAlt} ${selectedPhotoIndex + 1}`} fetchPriority="high" decoding="async" />
											{activePhoto.caption ? <figcaption>{activePhoto.caption}</figcaption> : null}
										</figure>
										<button className="finder-viewer__step finder-viewer__step--next" type="button" aria-label={text.next} onClick={() => step(1)}><ChevronRight aria-hidden="true" /></button>
									</div>
									<div className="finder-viewer__filmstrip" aria-label={`${collectionTitle(collection)} ${text.photographs}`}>
										{collection.photos.map((photo, index) => (
											<button className={index === selectedPhotoIndex ? 'is-active' : ''} type="button" key={photo.src} aria-label={`${text.openPhotograph}: ${photo.id}`} onClick={() => setSelectedPhotoIndex(index)}>
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
									selectedKeys={selectedPhotoIndex === null ? new Set() : new Set([String(selectedPhotoIndex)])}
									onSelectionChange={(keys) => {
										if (keys === 'all') return;
										const nextKey = keys.values().next().value;
										if (typeof nextKey === 'string') setSelectedPhotoIndex(Number(nextKey));
									}}
									onAction={(key) => setSelectedPhotoIndex(Number(key))}
									items={collection.photos}
								>
									{(photo) => {
										const index = collection.photos.indexOf(photo);
										return <GridListItem id={String(index)} textValue={photo.id}><img src={photo.thumbnail} alt="" loading="lazy" decoding="async" /><span>{photo.id}</span></GridListItem>;
									}}
								</GridList>
							) : (
								<div
									className="finder-grid-host"
									onKeyDown={(event) => {
										if (event.key !== 'Enter' || !selectedCollectionSlug) return;
										const selectedCollection = photoCollections.find((item) => item.slug === selectedCollectionSlug);
										if (selectedCollection) openCollection(selectedCollection);
									}}
								>
									<GridList
									className={`finder-grid finder-grid--collections finder-grid--${viewMode}`}
									aria-label={text.title}
									layout="grid"
									selectionMode="single"
									selectedKeys={selectedCollectionSlug ? new Set([selectedCollectionSlug]) : new Set()}
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
											<span className="finder-grid__item-label"><strong>{collectionTitle(item)}</strong><small>{item.photos.length} {text.works}</small></span>
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

import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { createPortal } from 'react-dom';
import UniverseScene from './UniverseScene';
import { type PlanetId, type V4Language } from '../../locales/v4';
import { V4_ROOM_CHANGE_EVENT, type V4RoomChangeDetail } from './v4Events';
import { parseV4Path, pushV4Path, v4Path, type V4RoomId } from './v4Routes';
import useV4Language from './useV4Language';
import './UniverseExperience.css';

const AboutMeWindow = lazy(() => import('./AboutMeWindow'));
const BlogBrowserWindow = lazy(() => import('./BlogBrowserWindow'));
const CommentsWindow = lazy(() => import('./CommentsWindow'));
const PhotoMuseum = lazy(() => import('./PhotoMuseum'));
const WorkExperienceWindow = lazy(() => import('./WorkExperienceWindow'));

type RoomId = V4RoomId;
type RoomProps = { language: V4Language; onClose: () => void };

const roomComponents = {
	about: AboutMeWindow,
	work: WorkExperienceWindow,
	posts: BlogBrowserWindow,
	photos: PhotoMuseum,
	comments: CommentsWindow,
} satisfies Record<RoomId, LazyExoticComponent<ComponentType<RoomProps>>>;

/** The client-only v4 island: Fiber owns the universe and React owns its rooms. */
export default function UniverseExperience() {
	const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(() => typeof window === 'undefined' ? null : parseV4Path(window.location.pathname)?.room ?? null);
	const language = useV4Language();
	const openRoom = useCallback((room: RoomId | null) => {
		pushV4Path(v4Path(language, room));
		setSelectedRoom(room);
	}, [language]);
	const closeWindow = useCallback(() => openRoom(null), [openRoom]);
	const openPlanet = useCallback((planet: PlanetId) => openRoom(planet), [openRoom]);
	const openAbout = useCallback(() => openRoom('about'), [openRoom]);

	useEffect(() => {
		const syncRoomFromUrl = () => setSelectedRoom(parseV4Path(window.location.pathname)?.room ?? null);
		window.addEventListener('popstate', syncRoomFromUrl);
		return () => window.removeEventListener('popstate', syncRoomFromUrl);
	}, []);

	useEffect(() => {
		window.dispatchEvent(new CustomEvent<V4RoomChangeDetail>(V4_ROOM_CHANGE_EVENT, { detail: { open: selectedRoom !== null } }));
	}, [selectedRoom]);

	useEffect(() => () => {
		window.dispatchEvent(new CustomEvent<V4RoomChangeDetail>(V4_ROOM_CHANGE_EVENT, { detail: { open: false } }));
	}, []);

	useEffect(() => {
		if (!selectedRoom) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) closeWindow();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [closeWindow, selectedRoom]);

	useEffect(() => {
		if (!selectedRoom) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	}, [selectedRoom]);

	const SelectedRoom = selectedRoom ? roomComponents[selectedRoom] : null;

	return (
		<div className="universe-experience">
			<UniverseScene language={language} onPlanetSelect={openPlanet} onAstronautSelect={openAbout} roomOpen={selectedRoom !== null} />

			{createPortal(
				SelectedRoom ? (
					<div
						className="universe-experience__panel"
						onClick={(event) => {
							if (event.target === event.currentTarget) closeWindow();
						}}
					>
						<div className="universe-experience__window">
							<Suspense fallback={<div className="universe-experience__loading" aria-hidden="true" />}>
								<SelectedRoom language={language} onClose={closeWindow} />
							</Suspense>
						</div>
					</div>
				) : null,
				document.body,
			)}
		</div>
	);
}

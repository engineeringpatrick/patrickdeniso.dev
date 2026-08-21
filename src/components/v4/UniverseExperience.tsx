import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { createPortal } from 'react-dom';
import UniverseScene from './UniverseScene';
import { type PlanetId, type V4Language } from '../../locales/v4';
import { V4_ROOM_CHANGE_EVENT, type V4RoomChangeDetail } from './v4Events';
import useV4Language from './useV4Language';
import './UniverseExperience.css';

const AboutMeWindow = lazy(() => import('./AboutMeWindow'));
const BlogBrowserWindow = lazy(() => import('./BlogBrowserWindow'));
const CommentsWindow = lazy(() => import('./CommentsWindow'));
const PhotoMuseum = lazy(() => import('./PhotoMuseum'));
const WorkExperienceWindow = lazy(() => import('./WorkExperienceWindow'));

type RoomId = PlanetId | 'about';
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
	const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null);
	const language = useV4Language();

	useEffect(() => {
		window.dispatchEvent(new CustomEvent<V4RoomChangeDetail>(V4_ROOM_CHANGE_EVENT, { detail: { open: selectedRoom !== null } }));
	}, [selectedRoom]);

	useEffect(() => () => {
		window.dispatchEvent(new CustomEvent<V4RoomChangeDetail>(V4_ROOM_CHANGE_EVENT, { detail: { open: false } }));
	}, []);

	useEffect(() => {
		if (!selectedRoom) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) setSelectedRoom(null);
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [selectedRoom]);

	useEffect(() => {
		if (!selectedRoom) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	}, [selectedRoom]);

	const closeWindow = () => setSelectedRoom(null);
	const openPlanet = (planet: PlanetId) => setSelectedRoom(planet);
	const openAbout = () => setSelectedRoom('about');
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

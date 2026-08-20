import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import UniverseScene from './UniverseScene';
import { type PlanetId, type V4Language } from './v4Content';
import './UniverseExperience.css';

const BlogBrowserWindow = lazy(() => import('./BlogBrowserWindow'));
const PhotoMuseum = lazy(() => import('./PhotoMuseum'));
const WorkExperienceWindow = lazy(() => import('./WorkExperienceWindow'));

const isLanguage = (value: string | undefined): value is V4Language => value === 'en' || value === 'it' || value === 'fr' || value === 'zh';

function useV4Language() {
	const [language, setLanguage] = useState<V4Language>('en');

	useEffect(() => {
		const updateLanguage = () => {
			const next = document.documentElement.dataset.v4Language;
			setLanguage(isLanguage(next) ? next : 'en');
		};
		updateLanguage();
		window.addEventListener('v4:language-change', updateLanguage);
		return () => window.removeEventListener('v4:language-change', updateLanguage);
	}, []);

	return language;
}

/** The client-only v4 island: Fiber owns the universe and React owns its rooms. */
export default function UniverseExperience() {
	const [selectedPlanet, setSelectedPlanet] = useState<PlanetId | null>(null);
	const language = useV4Language();

	useEffect(() => {
		if (!selectedPlanet) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) setSelectedPlanet(null);
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [selectedPlanet]);

	useEffect(() => {
		if (!selectedPlanet) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = previousOverflow; };
	}, [selectedPlanet]);

	const closeWindow = () => setSelectedPlanet(null);

	return (
		<div className="universe-experience">
			<UniverseScene language={language} onPlanetSelect={setSelectedPlanet} />

			{createPortal(
				selectedPlanet ? (
					<div
						className="universe-experience__panel"
						onClick={(event) => {
							if (event.target === event.currentTarget) closeWindow();
						}}
					>
						<div className="universe-experience__window">
							<Suspense fallback={<div className="universe-experience__loading" aria-hidden="true" />}>
								{selectedPlanet === 'work'
									? <WorkExperienceWindow language={language} onClose={closeWindow} />
									: selectedPlanet === 'posts'
										? <BlogBrowserWindow language={language} onClose={closeWindow} />
										: <PhotoMuseum language={language} onClose={closeWindow} />}
							</Suspense>
						</div>
					</div>
				) : null,
				document.body,
			)}
		</div>
	);
}

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { copy, type PlanetId, type V4Language } from '../../locales/v4';

type PlanetDetails = {
	id: PlanetId;
	label: string;
	modelUrl: string;
	color: string;
};

type UniverseSceneProps = {
	language: V4Language;
	onPlanetSelect: (planet: PlanetId) => void;
	className?: string;
};

type SceneLayout = {
	positions: Record<PlanetId, [number, number, number]>;
	planetSize: number;
	compact: boolean;
	showSun: boolean;
};

const modelUrls: Record<PlanetId, string> = {
	work: '/models/v4/work-mars.glb',
	posts: '/models/v4/posts-saturn.glb',
	photos: '/models/v4/photos-earth.glb',
};

const planetColors: Record<PlanetId, string> = {
	work: '#c76848',
	posts: '#d8b987',
	photos: '#4e8fc2',
};

const getLayout = (width: number): SceneLayout => {
	if (width < 600) {
		return {
			compact: true,
			showSun: false,
			planetSize: 1.72,
			positions: {
				work: [-1.55, 2.55, 1.1],
				posts: [1.55, 2.42, 0.45],
				photos: [1.5, -2.72, 1.3],
			},
		};
	}

	if (width < 900) {
		return {
			compact: false,
			showSun: false,
			planetSize: 2,
			positions: {
				work: [-2.65, 1.65, 1.1],
				posts: [2.65, 1.65, 0.45],
				photos: [2.3, -2.55, 1.3],
			},
		};
	}

	return {
		compact: false,
		showSun: true,
		planetSize: 2.2,
		positions: {
			work: [-4.35, 1.42, 1.1],
			posts: [4.15, 1.52, 0.45],
			photos: [3.3, -2.68, 1.35],
		},
	};
};

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		const update = () => setMatches(media.matches);
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	}, [query]);

	return matches;
}

function CameraParallax({ reducedMotion, compact }: { reducedMotion: boolean; compact: boolean }) {
	const target = useMemo(() => new THREE.Vector3(), []);
	const cameraZ = compact ? 14.8 : 13.5;

	useFrame(({ camera, pointer }, delta) => {
		if (reducedMotion || compact) {
			camera.position.set(0, 0.2, cameraZ);
			camera.lookAt(0, 0, 0);
			return;
		}

		target.set(pointer.x * 0.46, 0.2 + pointer.y * 0.3, cameraZ);
		camera.position.lerp(target, 1 - Math.exp(-delta * 3.8));
		camera.lookAt(0, 0, 0);
	});

	return null;
}

function PlanetModel({ url, size }: { url: string; size: number }) {
	const { scene } = useLoader(GLTFLoader, url, (loader) => loader.setMeshoptDecoder(MeshoptDecoder));
	const model = useMemo(() => {
		const cloned = scene.clone(true);
		const bounds = new THREE.Box3().setFromObject(cloned);
		const center = bounds.getCenter(new THREE.Vector3());
		const dimensions = bounds.getSize(new THREE.Vector3());
		const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;

		cloned.position.sub(center);
		cloned.scale.setScalar(size / largestDimension);
		return cloned;
	}, [scene, size]);

	return <primitive object={model} />;
}

function StarField({ compact, reducedMotion }: { compact: boolean; reducedMotion: boolean }) {
	const points = useRef<THREE.Points>(null);
	const positions = useMemo(() => {
		const count = compact ? 1200 : 2200;
		const values = new Float32Array(count * 3);
		for (let index = 0; index < count; index += 1) {
			const radius = 18 + Math.random() * 28;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			values[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
			values[index * 3 + 1] = radius * Math.cos(phi);
			values[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
		}
		return values;
	}, [compact]);

	useFrame((_, delta) => {
		if (points.current && !reducedMotion) points.current.rotation.y += delta * 0.003;
	});

	return (
		<points ref={points}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial color="#dce5ff" size={compact ? 0.065 : 0.052} sizeAttenuation transparent opacity={0.82} depthWrite={false} />
		</points>
	);
}

function PlanetFallback({ color, size }: { color: string; size: number }) {
	return (
		<mesh scale={size * 0.46}>
			<icosahedronGeometry args={[1, 3]} />
			<meshStandardMaterial color={color} roughness={0.9} />
		</mesh>
	);
}

function SunModel({ reducedMotion }: { reducedMotion: boolean }) {
	const source = useLoader(USDLoader, '/models/v4/sun.usdz');
	const group = useRef<THREE.Group>(null);
	const model = useMemo(() => {
		const cloned = source.clone(true);
		const bounds = new THREE.Box3().setFromObject(cloned);
		const center = bounds.getCenter(new THREE.Vector3());
		const dimensions = bounds.getSize(new THREE.Vector3());
		const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
		cloned.position.sub(center);
		cloned.scale.setScalar(2.35 / largestDimension);
		return cloned;
	}, [source]);

	useFrame((_, delta) => {
		if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.035;
	});

	return <group ref={group}><primitive object={model} /></group>;
}

function DistantSun({ reducedMotion }: { reducedMotion: boolean }) {
	return (
		<group position={[-9.6, 5.8, -16]} scale={0.9}>
			<Suspense fallback={<PlanetFallback color="#f29f32" size={2.35} />}>
				<SunModel reducedMotion={reducedMotion} />
			</Suspense>
			<mesh scale={1.48}>
				<sphereGeometry args={[1.5, 20, 20]} />
				<meshBasicMaterial color="#ffb32f" transparent opacity={0.1} depthWrite={false} />
			</mesh>
			<pointLight color="#ffb75f" intensity={32} distance={24} decay={2} />
		</group>
	);
}

type PlanetProps = {
	planet: PlanetDetails;
	position: [number, number, number];
	size: number;
	hovered: boolean;
	reducedMotion: boolean;
	onHover: (id: PlanetId | null) => void;
	onSelect: (id: PlanetId) => void;
};

function Planet({ planet, position, size, hovered, reducedMotion, onHover, onSelect }: PlanetProps) {
	const group = useRef<THREE.Group>(null);
	const body = useRef<THREE.Group>(null);
	const floatOffset = planet.id === 'work' ? 0 : planet.id === 'posts' ? 1.2 : 2.3;

	useFrame(({ clock }, delta) => {
		if (!group.current || !body.current) return;
		const targetScale = hovered ? 1.16 : 1;
		if (reducedMotion) {
			group.current.position.y = position[1];
			group.current.scale.setScalar(targetScale);
			return;
		}

		const time = clock.getElapsedTime();
		group.current.position.y = position[1] + Math.sin(time * 1.05 + floatOffset) * 0.13;
		body.current.rotation.y += delta * (0.18 + floatOffset * 0.03);
		body.current.rotation.x = Math.sin(time * 0.8 + floatOffset) * 0.08;
		group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, targetScale, 8, delta));
	});

	const handleOver = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		onHover(planet.id);
	};

	const handleOut = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		onHover(null);
	};

	const handleClick = (event: ThreeEvent<MouseEvent>) => {
		event.stopPropagation();
		onSelect(planet.id);
	};

	return (
		<group ref={group} position={position} onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
			<group ref={body}>
				<Suspense fallback={<PlanetFallback color={planet.color} size={size} />}>
					<PlanetModel url={planet.modelUrl} size={size} />
				</Suspense>
			</group>
		</group>
	);
}

function UniverseContents({
	reducedMotion,
	hovered,
	planets,
	onHover,
	onSelect,
}: {
	reducedMotion: boolean;
	hovered: PlanetId | null;
	planets: Record<PlanetId, PlanetDetails>;
	onHover: (id: PlanetId | null) => void;
	onSelect: (id: PlanetId) => void;
}) {
	const width = useThree((state) => state.size.width);
	const layout = useMemo(() => getLayout(width), [width]);
	return (
		<>
			<color attach="background" args={['#050617']} />
			<fog attach="fog" args={['#050617', 15, 36]} />
			<hemisphereLight args={['#93a5ff', '#160d30', 2.2]} />
			<directionalLight color="#ffdfb0" intensity={3.1} position={[-5, 6, 8]} />
			<pointLight color="#a674ff" intensity={19} distance={16} decay={2} position={[5, 1, 5]} />

			<StarField compact={layout.compact} reducedMotion={reducedMotion} />
			<mesh position={[1, -3, -13]} scale={[16.2, 5.6, 6.3]}>
				<sphereGeometry args={[1, 20, 20]} />
				<meshBasicMaterial color="#4b2d8e" transparent opacity={0.09} side={THREE.BackSide} />
			</mesh>

			{layout.showSun ? <DistantSun reducedMotion={reducedMotion} /> : null}
			{(Object.keys(planets) as PlanetId[]).map((id) => (
				<Planet
					key={id}
					planet={planets[id]}
					position={layout.positions[id]}
					size={layout.planetSize}
					hovered={hovered === id}
					reducedMotion={reducedMotion}
					onHover={onHover}
					onSelect={onSelect}
				/>
			))}
			<CameraParallax reducedMotion={reducedMotion} compact={layout.compact} />
		</>
	);
}

export default function UniverseScene({ onPlanetSelect, language, className }: UniverseSceneProps) {
	const [hovered, setHovered] = useState<PlanetId | null>(null);
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
	const compact = useMediaQuery('(max-width: 599px)');
	const coarsePointer = useMediaQuery('(hover: none), (pointer: coarse)');
	const planets = useMemo<Record<PlanetId, PlanetDetails>>(() => ({
		work: { id: 'work', label: copy[language].planets.work, modelUrl: modelUrls.work, color: planetColors.work },
		posts: { id: 'posts', label: copy[language].planets.posts, modelUrl: modelUrls.posts, color: planetColors.posts },
		photos: { id: 'photos', label: copy[language].planets.photos, modelUrl: modelUrls.photos, color: planetColors.photos },
	}), [language]);

	const setHover = (id: PlanetId | null) => setHovered((current) => current === id ? current : id);
	const visibleLabels = compact || coarsePointer ? (Object.keys(planets) as PlanetId[]) : hovered ? [hovered] : [];

	return (
		<div className={`${className ? `universe-scene ${className}` : 'universe-scene'}${hovered ? ' is-hovering' : ''}`}>
			<Canvas
				dpr={compact ? 1 : [1, 1.5]}
				camera={{ position: [0, 0.2, compact ? 14.8 : 13.5], fov: 42, near: 0.1, far: 100 }}
				gl={{ antialias: !compact, alpha: false, powerPreference: compact ? 'default' : 'high-performance' }}
				performance={{ min: 0.65 }}
				aria-label={copy[language].site.sceneLabel}
				onPointerMissed={() => setHover(null)}
			>
				<UniverseContents
					reducedMotion={reducedMotion}
					hovered={hovered}
					planets={planets}
					onHover={setHover}
					onSelect={onPlanetSelect}
				/>
			</Canvas>
			<div className="universe-scene__labels" aria-hidden="true">
				{visibleLabels.map((id) => <div className={`universe-planet-label universe-planet-label--${id}`} key={id}><strong>{planets[id].label}</strong></div>)}
			</div>
			<nav className="universe-scene__accessible-nav" aria-label={copy[language].site.sceneLabel}>
				{(Object.keys(planets) as PlanetId[]).map((id) => <button type="button" key={id} onClick={() => onPlanetSelect(id)}>{planets[id].label}</button>)}
			</nav>
		</div>
	);
}

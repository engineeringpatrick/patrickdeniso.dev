import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { copy, type PlanetId, type V4Language } from '../../locales/v4';
import { cloneAndFitModel } from './fitModel';

const DistantSun = lazy(() => import('./DistantSun'));
const planetIds = ['work', 'posts', 'photos'] as const satisfies readonly PlanetId[];
const sceneTargetIds = [...planetIds, 'about'] as const satisfies readonly SceneTargetId[];
const desktopDpr: [number, number] = [1, 1.5];
const canvasPerformance = { min: 0.65 };

type PlanetDetails = {
	id: PlanetId;
	label: string;
	modelUrl: string;
	color: string;
};

type UniverseSceneProps = {
	language: V4Language;
	onPlanetSelect: (planet: PlanetId) => void;
	onAstronautSelect: () => void;
	roomOpen: boolean;
	className?: string;
};

type SceneTargetId = PlanetId | 'about';
type HtmlElementRef = { current: HTMLDivElement | null };

type SceneLayout = {
	positions: Record<PlanetId, [number, number, number]>;
	astronautPosition: [number, number, number];
	astronautDriftAmplitude: number;
	planetSize: number;
	astronautSize: number;
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

const planetFloatOffsets: Record<PlanetId, number> = { work: 0, posts: 1.2, photos: 2.3 };
const milkyWayVertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const milkyWayFragmentShader = `
	varying vec2 vUv;

	float hash(vec2 point) {
		return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
	}

	float noise(vec2 point) {
		vec2 cell = floor(point);
		vec2 offset = fract(point);
		offset = offset * offset * (3.0 - 2.0 * offset);
		return mix(
			mix(hash(cell), hash(cell + vec2(1.0, 0.0)), offset.x),
			mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), offset.x),
			offset.y
		);
	}

	float fbm(vec2 point) {
		float value = 0.0;
		float amplitude = 0.5;
		for (int octave = 0; octave < 4; octave++) {
			value += noise(point) * amplitude;
			point = point * 2.03 + 7.1;
			amplitude *= 0.5;
		}
		return value;
	}

	void main() {
		float distanceFromCore = abs(vUv.y - 0.5) * 2.0;
		float softBand = 1.0 - smoothstep(0.08, 1.0, distanceFromCore);
		float clouds = fbm(vec2(vUv.x * 8.0, vUv.y * 4.5));
		float brokenEdge = fbm(vec2(vUv.x * 17.0 + 4.0, vUv.y * 8.0));
		float alpha = softBand * (0.075 + clouds * 0.27) * (0.35 + brokenEdge * 0.65);
		vec3 coolDust = vec3(0.32, 0.39, 0.78);
		vec3 warmCore = vec3(0.82, 0.72, 0.82);
		vec3 color = mix(coolDust, warmCore, softBand * clouds);
		if (alpha < 0.004) discard;
		gl_FragColor = vec4(color, alpha);
	}
`;
const configureGLTFLoader = (loader: GLTFLoader) => loader.setMeshoptDecoder(MeshoptDecoder);
const pickRandomTarget = (current?: SceneTargetId): SceneTargetId => {
	const candidates = current ? sceneTargetIds.filter((id) => id !== current) : sceneTargetIds;
	return candidates[Math.floor(Math.random() * candidates.length)];
};

const positionHtmlAtObject = (
	element: HTMLDivElement,
	object: THREE.Object3D,
	camera: THREE.Camera,
	viewport: { width: number; height: number },
	projectedPosition: THREE.Vector3,
	yOffset = 0,
) => {
	object.getWorldPosition(projectedPosition);
	projectedPosition.y += yOffset;
	projectedPosition.project(camera);
	element.style.left = `${(projectedPosition.x * 0.5 + 0.5) * viewport.width}px`;
	element.style.top = `${(-projectedPosition.y * 0.5 + 0.5) * viewport.height}px`;
	element.style.visibility = 'visible';
};

const getLayout = (width: number): SceneLayout => {
	if (width < 600) {
		return {
			compact: true,
			showSun: false,
			planetSize: 1.72,
			astronautSize: 1.02,
			astronautPosition: [-1.45, -3.78, 2.15],
			astronautDriftAmplitude: 0.12,
			positions: {
				work: [-1.55, 2.55, 1.1],
				posts: [2.05, 2.42, 0.45],
				photos: [1.5, -3.62, 1.3],
			},
		};
	}

	if (width < 900) {
		return {
			compact: false,
			showSun: false,
			planetSize: 2,
			astronautSize: 1.25,
			astronautPosition: [-4.25, -2.82, 2.05],
			astronautDriftAmplitude: 0.2,
			positions: {
				work: [-2.65, 1.65, 1.1],
				posts: [3.35, 1.65, 0.45],
				photos: [2.3, -2.55, 1.3],
			},
		};
	}

	return {
		compact: false,
		showSun: true,
		planetSize: 2.2,
		astronautSize: 1.4,
		astronautPosition: [-5.2, -2.05, 2.05],
		astronautDriftAmplitude: 0.28,
		positions: {
			work: [-4.35, 1.42, 1.1],
			posts: [5.25, 1.52, 0.45],
			photos: [3.3, -2.68, 1.35],
		},
	};
};

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);

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

function FittedGLTFModel({ url, size }: { url: string; size: number }) {
	const { scene } = useLoader(GLTFLoader, url, configureGLTFLoader);
	const model = useMemo(() => cloneAndFitModel(scene, size), [scene, size]);

	return <primitive object={model} />;
}

function StarField({ compact, reducedMotion }: { compact: boolean; reducedMotion: boolean }) {
	const points = useRef<THREE.Points>(null);
	const positions = useMemo(() => {
		const count = compact ? 1600 : 3200;
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

function TwinkleField({ compact, reducedMotion }: { compact: boolean; reducedMotion: boolean }) {
	const points = useRef<THREE.Points>(null);
	const material = useRef<THREE.PointsMaterial>(null);
	const positions = useMemo(() => {
		const count = compact ? 110 : 260;
		const values = new Float32Array(count * 3);
		for (let index = 0; index < count; index += 1) {
			const radius = 9 + Math.random() * 13;
			const theta = Math.random() * Math.PI * 2;
			const height = (Math.random() - 0.5) * 8;
			values[index * 3] = Math.cos(theta) * radius;
			values[index * 3 + 1] = height;
			values[index * 3 + 2] = -7 - Math.random() * 15;
		}
		return values;
	}, [compact]);

	useFrame(({ clock }, delta) => {
		if (!points.current || !material.current) return;
		if (!reducedMotion) {
			points.current.rotation.y += delta * 0.004;
			material.current.opacity = 0.36 + Math.sin(clock.getElapsedTime() * 1.7) * 0.13;
		}
	});

	return (
		<points ref={points}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial ref={material} color="#ffffff" size={compact ? 0.1 : 0.075} sizeAttenuation transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
		</points>
	);
}

function MilkyWayBand({ compact, reducedMotion }: { compact: boolean; reducedMotion: boolean }) {
	const band = useRef<THREE.Group>(null);
	const positions = useMemo(() => {
		const count = compact ? 420 : 1100;
		const values = new Float32Array(count * 3);
		let seed = 0x51f15e;
		const random = () => {
			seed = Math.imul(seed, 1664525) + 1013904223 | 0;
			return (seed >>> 0) / 4294967296;
		};
		for (let index = 0; index < count; index += 1) {
			const x = (random() - 0.5) * 42;
			const clusteredOffset = random() + random() + random() + random() - 2;
			const center = Math.sin(x * 0.32) * 0.28 + Math.sin(x * 0.11 + 1.4) * 0.42;
			values[index * 3] = x;
			values[index * 3 + 1] = center + clusteredOffset * (compact ? 1.2 : 1.65);
			values[index * 3 + 2] = (random() - 0.5) * 1.8;
		}
		return values;
	}, [compact]);

	useFrame(({ clock }) => {
		if (band.current && !reducedMotion) band.current.rotation.z = -0.27 + Math.sin(clock.getElapsedTime() * 0.045) * 0.012;
	});

	return (
		<group ref={band} position={[0, -0.45, -14]} rotation={[0, 0, -0.27]}>
			<mesh>
				<planeGeometry args={[80, compact ? 7.5 : 9]} />
				<shaderMaterial vertexShader={milkyWayVertexShader} fragmentShader={milkyWayFragmentShader} transparent depthWrite={false} blending={THREE.NormalBlending} />
			</mesh>
			<points>
				<bufferGeometry>
					<bufferAttribute attach="attributes-position" args={[positions, 3]} />
				</bufferGeometry>
				<pointsMaterial color="#eef0ff" size={compact ? 0.1 : 0.078} sizeAttenuation transparent opacity={compact ? 0.58 : 0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
			</points>
		</group>
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

function DistantSunFallback() {
	return (
		<group position={[-9.6, 5.8, -16]} scale={0.9}>
			<PlanetFallback color="#f29f32" size={2.35} />
		</group>
	);
}

type PlanetProps = {
	planet: PlanetDetails;
	position: [number, number, number];
	size: number;
	hovered: boolean;
	reducedMotion: boolean;
	onHover: (id: SceneTargetId | null) => void;
	onSelect: (id: PlanetId) => void;
	hintElement: HtmlElementRef | null;
};

function Planet({ planet, position, size, hovered, reducedMotion, onHover, onSelect, hintElement }: PlanetProps) {
	const group = useRef<THREE.Group>(null);
	const body = useRef<THREE.Group>(null);
	const projectedPosition = useMemo(() => new THREE.Vector3(), []);
	const floatOffset = planetFloatOffsets[planet.id];

	useFrame(({ camera, clock, size: viewport }, delta) => {
		if (!group.current || !body.current) return;
		const targetScale = hovered ? 1.16 : 1;
		if (reducedMotion) {
			group.current.position.y = position[1];
			group.current.scale.setScalar(targetScale);
		} else {
			const time = clock.getElapsedTime();
			group.current.position.y = position[1] + Math.sin(time * 1.05 + floatOffset) * 0.13;
			body.current.rotation.y += delta * (0.18 + floatOffset * 0.03);
			body.current.rotation.x = Math.sin(time * 0.8 + floatOffset) * 0.08;
			group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, targetScale, 8, delta));
		}

		if (hintElement?.current) positionHtmlAtObject(hintElement.current, group.current, camera, viewport, projectedPosition);
	});

	const handleOver = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		onHover(planet.id);
	};

	const handleOut = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		onHover(null);
	};

	const handleSelect = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		onSelect(planet.id);
	};

	return (
		<group ref={group} position={position} onPointerOver={handleOver} onPointerOut={handleOut} onPointerDown={handleSelect}>
			<group ref={body}>
				<Suspense fallback={<PlanetFallback color={planet.color} size={size} />}>
					<FittedGLTFModel url={planet.modelUrl} size={size} />
				</Suspense>
			</group>
		</group>
	);
}

function Astronaut({
	position,
	driftAmplitude,
	size,
	hovered,
	reducedMotion,
	onHover,
	onSelect,
	labelElement,
	hintElement,
}: {
	position: [number, number, number];
	driftAmplitude: number;
	size: number;
	hovered: boolean;
	reducedMotion: boolean;
	onHover: (id: SceneTargetId | null) => void;
	onSelect: () => void;
	labelElement: HtmlElementRef;
	hintElement: HtmlElementRef | null;
}) {
	const group = useRef<THREE.Group>(null);
	const body = useRef<THREE.Group>(null);
	const projectedPosition = useMemo(() => new THREE.Vector3(), []);

	useFrame(({ camera, clock, size: viewport }, delta) => {
		if (!group.current || !body.current) return;
		const targetScale = hovered ? 1.16 : 1;
		if (reducedMotion) {
			group.current.position.set(...position);
			body.current.rotation.set(0, 0, 0);
			group.current.scale.setScalar(targetScale);
		} else {
			const time = clock.getElapsedTime();
			// Stay in the safe area where the astronaut starts; the movement is a
			// small, gentle float rather than an orbit through other UI elements.
			group.current.position.x = position[0] + Math.sin(time * 0.32 + 1.7) * driftAmplitude;
			group.current.position.y = position[1] + Math.cos(time * 0.38 + 0.8) * driftAmplitude * 0.78;
			// Keep a fixed foreground depth so scene elements cannot cover it.
			group.current.position.z = position[2];
			// Face the viewer; only add a barely perceptible movement on each axis.
			body.current.rotation.x = Math.sin(time * 0.31) * 0.045;
			body.current.rotation.y = Math.cos(time * 0.24) * 0.055;
			body.current.rotation.z = Math.sin(time * 0.27) * 0.04;
			group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, targetScale, 7, delta));
		}

		if (labelElement.current) {
			positionHtmlAtObject(labelElement.current, group.current, camera, viewport, projectedPosition, size * 0.62);
		}
		if (hintElement?.current) positionHtmlAtObject(hintElement.current, group.current, camera, viewport, projectedPosition);
	});

	return (
		<group
			ref={group}
			position={position}
			onPointerOver={(event) => { event.stopPropagation(); onHover('about'); }}
			onPointerOut={(event) => { event.stopPropagation(); onHover(null); }}
			onPointerDown={(event) => { event.stopPropagation(); onSelect(); }}
		>
			<group ref={body}>
				<Suspense fallback={<PlanetFallback color="#d9e4ef" size={size} />}>
					<FittedGLTFModel url="/models/v4/astronaut.glb" size={size} />
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
	onAstronautSelect,
	astronautLabelElement,
	clickHintTarget,
	clickHintElement,
}: {
	reducedMotion: boolean;
	hovered: SceneTargetId | null;
	planets: Record<PlanetId, PlanetDetails>;
	onHover: (id: SceneTargetId | null) => void;
	onSelect: (id: PlanetId) => void;
	onAstronautSelect: () => void;
	astronautLabelElement: HtmlElementRef;
	clickHintTarget: SceneTargetId;
	clickHintElement: HtmlElementRef;
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
			<TwinkleField compact={layout.compact} reducedMotion={reducedMotion} />
			<MilkyWayBand compact={layout.compact} reducedMotion={reducedMotion} />
			<Astronaut position={layout.astronautPosition} driftAmplitude={layout.astronautDriftAmplitude} size={layout.astronautSize} hovered={hovered === 'about'} reducedMotion={reducedMotion} onHover={onHover} onSelect={onAstronautSelect} labelElement={astronautLabelElement} hintElement={clickHintTarget === 'about' ? clickHintElement : null} />

			{layout.showSun ? <Suspense fallback={<DistantSunFallback />}><DistantSun reducedMotion={reducedMotion} /></Suspense> : null}
			{planetIds.map((id) => (
				<Planet
					key={id}
					planet={planets[id]}
					position={layout.positions[id]}
					size={layout.planetSize}
					hovered={hovered === id}
					reducedMotion={reducedMotion}
					onHover={onHover}
					onSelect={onSelect}
					hintElement={clickHintTarget === id ? clickHintElement : null}
				/>
			))}
			<CameraParallax reducedMotion={reducedMotion} compact={layout.compact} />
		</>
	);
}

export default function UniverseScene({ onPlanetSelect, onAstronautSelect, roomOpen, language, className }: UniverseSceneProps) {
	const [hovered, setHovered] = useState<SceneTargetId | null>(null);
	const [clickHintTarget, setClickHintTarget] = useState<SceneTargetId>(() => pickRandomTarget());
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
	const compact = useMediaQuery('(max-width: 599px)');
	const coarsePointer = useMediaQuery('(hover: none), (pointer: coarse)');
	const astronautLabelElement = useRef<HTMLDivElement>(null);
	const clickHintElement = useRef<HTMLDivElement>(null);
	const roomWasOpen = useRef(roomOpen);
	const camera = useMemo(() => ({ position: [0, 0.2, compact ? 14.8 : 13.5] as [number, number, number], fov: 42, near: 0.1, far: 100 }), [compact]);
	const gl = useMemo(() => ({ antialias: !compact, alpha: false, powerPreference: compact ? 'default' as const : 'high-performance' as const }), [compact]);
	const planets = useMemo<Record<PlanetId, PlanetDetails>>(() => ({
		work: { id: 'work', label: copy[language].planets.work, modelUrl: modelUrls.work, color: planetColors.work },
		posts: { id: 'posts', label: copy[language].planets.posts, modelUrl: modelUrls.posts, color: planetColors.posts },
		photos: { id: 'photos', label: copy[language].planets.photos, modelUrl: modelUrls.photos, color: planetColors.photos },
	}), [language]);

	const setHover = useCallback((id: SceneTargetId | null) => setHovered((current) => current === id ? current : id), []);
	const clearHover = useCallback(() => setHover(null), [setHover]);
	const labels = useMemo<Record<SceneTargetId, string>>(() => ({
		work: planets.work.label,
		posts: planets.posts.label,
		photos: planets.photos.label,
		about: copy[language].about.title,
	}), [language, planets]);
	const visibleLabels: readonly PlanetId[] = compact || coarsePointer ? planetIds : hovered && hovered !== 'about' ? [hovered] : [];
	const showAstronautLabel = compact || coarsePointer || hovered === 'about';

	useEffect(() => {
		const universeBecameVisible = roomWasOpen.current && !roomOpen;
		roomWasOpen.current = roomOpen;
		if (universeBecameVisible) setClickHintTarget((current) => pickRandomTarget(current));
	}, [roomOpen]);

	return (
		<div className={`${className ? `universe-scene ${className}` : 'universe-scene'}${hovered ? ' is-hovering' : ''}`}>
			<Canvas
				dpr={compact ? 1 : desktopDpr}
				camera={camera}
				gl={gl}
				performance={canvasPerformance}
				aria-label={copy[language].site.sceneLabel}
				onPointerMissed={clearHover}
			>
				<UniverseContents
					reducedMotion={reducedMotion}
					hovered={hovered}
					planets={planets}
					onHover={setHover}
					onSelect={onPlanetSelect}
					onAstronautSelect={onAstronautSelect}
					astronautLabelElement={astronautLabelElement}
					clickHintTarget={clickHintTarget}
					clickHintElement={clickHintElement}
				/>
			</Canvas>
			<div className="universe-scene__labels" aria-hidden="true">
				{visibleLabels.map((id) => <div className={`universe-planet-label universe-planet-label--${id}`} key={id}><strong>{labels[id]}</strong></div>)}
				{showAstronautLabel ? <div ref={astronautLabelElement} className="universe-planet-label universe-planet-label--about"><strong>{labels.about}</strong></div> : null}
			</div>
			<div className="universe-scene__click-hints" aria-hidden="true">
				<div ref={clickHintElement} className={`universe-click-hint universe-click-hint--${clickHintTarget}${hovered === clickHintTarget ? ' is-hovered' : ''}`} key={clickHintTarget}>
					<span>{copy[language].site.clickMe}</span>
					<svg viewBox="0 0 58 38" preserveAspectRatio="none" role="presentation">
						<path d="M3 4c22-4 45 8 52 30" />
						<path d="m45 29 10 6 2-12" />
					</svg>
				</div>
			</div>
			<nav className="universe-scene__accessible-nav" aria-label={copy[language].site.sceneLabel}>
				{planetIds.map((id) => <button type="button" key={id} onClick={() => onPlanetSelect(id)}>{planets[id].label}</button>)}
				<button type="button" onClick={onAstronautSelect}>{labels.about}</button>
			</nav>
		</div>
	);
}

import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { USDLoader } from 'three/addons/loaders/USDLoader.js';
import { cloneAndFitModel } from './fitModel';

export default function DistantSun({ reducedMotion }: { reducedMotion: boolean }) {
	const source = useLoader(USDLoader, '/models/v4/sun.usdz');
	const body = useRef<THREE.Group>(null);
	const model = useMemo(() => cloneAndFitModel(source, 2.35), [source]);

	useFrame((_, delta) => {
		if (body.current && !reducedMotion) body.current.rotation.y += delta * 0.035;
	});

	return (
		<group position={[-9.6, 5.8, -16]} scale={0.9}>
			<group ref={body}><primitive object={model} /></group>
			<mesh scale={1.48}>
				<sphereGeometry args={[1.5, 20, 20]} />
				<meshBasicMaterial color="#ffb32f" transparent opacity={0.1} depthWrite={false} />
			</mesh>
			<pointLight color="#ffb75f" intensity={32} distance={24} decay={2} />
		</group>
	);
}

import * as THREE from 'three';

/** Clone, center, and uniformly fit a model without mutating the loader cache. */
export function cloneAndFitModel(source: THREE.Object3D, size: number) {
	const model = source.clone(true);
	const bounds = new THREE.Box3().setFromObject(model);
	const center = bounds.getCenter(new THREE.Vector3());
	const dimensions = bounds.getSize(new THREE.Vector3());
	const largestDimension = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;

	model.position.sub(center);
	model.scale.setScalar(size / largestDimension);
	return model;
}

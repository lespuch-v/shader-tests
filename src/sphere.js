import * as THREE from 'three';

export function createSphere(scene) {
  const geometry = new THREE.SphereGeometry(1.5, 128, 128);
  // Material is managed by shaderManager — placeholder until first setShader call
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ visible: false }));
  scene.add(mesh);
  return mesh;
}

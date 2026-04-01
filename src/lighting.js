import * as THREE from 'three';

/**
 * 3-point studio lighting rig:
 *   Key light  — warm white, top-left-front, strongest
 *   Fill light — cool blue-white, right-mid, softer
 *   Rim light  — neutral white, behind-top, creates edge separation
 */
export function createStudioLights(scene) {
  // Ambient — very dim base fill so shadows aren't pitch black
  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);

  // Key light: warm, positioned upper-left-front
  const keyLight = new THREE.DirectionalLight(0xfff5e6, 3.5);
  keyLight.position.set(-3, 4, 4);
  scene.add(keyLight);

  // Fill light: cool blue-white, right side, reduced intensity
  const fillLight = new THREE.DirectionalLight(0xc8d8ff, 1.5);
  fillLight.position.set(4, 1, 2);
  scene.add(fillLight);

  // Rim / back light: behind and above to separate sphere from background
  const rimLight = new THREE.DirectionalLight(0xffffff, 2.2);
  rimLight.position.set(0.5, 3, -4);
  scene.add(rimLight);

  return {
    ambient,
    keyLight,
    fillLight,
    rimLight,
    // Expose light data as uniforms for ShaderMaterial
    uniforms: {
      uKeyLightPos:       { value: keyLight.position },
      uKeyLightColor:     { value: new THREE.Color(0xfff5e6) },
      uKeyLightIntensity: { value: keyLight.intensity },

      uFillLightPos:       { value: fillLight.position },
      uFillLightColor:     { value: new THREE.Color(0xc8d8ff) },
      uFillLightIntensity: { value: fillLight.intensity },

      uRimLightPos:       { value: rimLight.position },
      uRimLightColor:     { value: new THREE.Color(0xffffff) },
      uRimLightIntensity: { value: rimLight.intensity },

      uAmbientColor:     { value: new THREE.Color(0xffffff) },
      uAmbientIntensity: { value: ambient.intensity },
    },
  };
}

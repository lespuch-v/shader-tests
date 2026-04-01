import * as THREE from 'three';
import defaultVert from './shaders/default.vert';
import defaultFrag from './shaders/default.frag';
import lavaVert    from './shaders/lava.vert';
import lavaFrag    from './shaders/lava.frag';
import plasmaVert  from './shaders/plasma.vert';
import plasmaFrag  from './shaders/plasma.frag';
import fullscreenVert from './shaders/fullscreen.vert';
import morphSdfFrag from './shaders/morph-sdf.frag';
import starTorsionFrag from './shaders/star-torsion.frag';
import turbulenceCoreFrag from './shaders/turbulence-core.frag';

export function createShaderManager({ camera, lightUniforms }) {
  const textureLoader = new THREE.TextureLoader();

  // Lazy-loaded lava textures — only fetched when lava shader is first activated
  let lavaTextures = null;
  function getLavaTextures() {
    if (lavaTextures) return lavaTextures;
    const cloud = textureLoader.load('/textures/lava/cloud.png');
    const lava  = textureLoader.load('/textures/lava/lavatile.jpg');
    cloud.wrapS = cloud.wrapT = THREE.RepeatWrapping;
    lava.wrapS  = lava.wrapT  = THREE.RepeatWrapping;
    lava.colorSpace = THREE.SRGBColorSpace;
    lavaTextures = { cloud, lava };
    return lavaTextures;
  }

  // ─── Shader registry ───────────────────────────────────────────────────────
  // To add a new shader: push another entry to this array.
  const registry = [
    {
      id: 'studio',
      name: 'Studio',
      mode: 'mesh',
      bloom: 0,
      createMaterial() {
        return new THREE.ShaderMaterial({
          vertexShader:   defaultVert,
          fragmentShader: defaultFrag,
          uniforms: {
            uCameraPos: { value: new THREE.Vector3() },
            ...lightUniforms,
            uBaseColor:     { value: new THREE.Color(0.6, 0.6, 0.6) },
            uRoughness:     { value: 0.4 },
            uSpecularPower: { value: 64.0 },
          },
        });
      },
      onFrame(uniforms) {
        uniforms.uCameraPos.value.copy(camera.position);
      },
    },

    {
      id: 'lava',
      name: 'Lava',
      mode: 'mesh',
      bloom: 1.1,
      createMaterial() {
        const { cloud, lava } = getLavaTextures();
        return new THREE.ShaderMaterial({
          vertexShader:   lavaVert,
          fragmentShader: lavaFrag,
          uniforms: {
            fogDensity: { value: 0.06 },
            fogColor:   { value: new THREE.Vector3(0.12, 0.03, 0.01) },
            time:       { value: 1.0 },
            uvScale:    { value: new THREE.Vector2(3.0, 1.0) },
            texture1:   { value: cloud },
            texture2:   { value: lava },
          },
        });
      },
      onFrame(uniforms, delta) {
        uniforms.time.value += 0.2 * delta * 5;
      },
    },

    {
      id: 'plasma',
      name: 'Plasma',
      mode: 'mesh',
      bloom: 0.45,
      createMaterial() {
        return new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader:   plasmaVert,
          fragmentShader: plasmaFrag,
          uniforms: {
            uTime: { value: 0.0 },
          },
        });
      },
      onFrame(uniforms, delta) {
        uniforms.uTime.value += delta;
      },
    },

    {
      id: 'morph-sdf',
      name: 'Morph SDF',
      mode: 'fullscreen',
      bloom: 0,
      createMaterial() {
        return new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: fullscreenVert,
          fragmentShader: morphSdfFrag,
          uniforms: {
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          },
        });
      },
      onFrame(uniforms, delta) {
        uniforms.uTime.value += delta;
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      },
    },

    {
      id: 'star-torsion',
      name: 'Star Torsion',
      mode: 'fullscreen',
      bloom: 0,
      createMaterial() {
        return new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: fullscreenVert,
          fragmentShader: starTorsionFrag,
          uniforms: {
            uTime: { value: performance.now() * 0.001 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          },
        });
      },
      onFrame(uniforms) {
        uniforms.uTime.value = performance.now() * 0.001;
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      },
    },

    {
      id: 'turbulence-core',
      name: 'Turbulence Core',
      mode: 'fullscreen',
      bloom: 0,
      createMaterial() {
        return new THREE.ShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: fullscreenVert,
          fragmentShader: turbulenceCoreFrag,
          uniforms: {
            uTime: { value: performance.now() * 0.001 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          },
        });
      },
      onFrame(uniforms) {
        uniforms.uTime.value = performance.now() * 0.001;
        uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      },
    },
  ];

  // ─── State ─────────────────────────────────────────────────────────────────
  let activeDef = null;
  let activeMesh = null;
  let activeFullscreenQuad = null;

  function setMesh(mesh) {
    activeMesh = mesh;
  }

  function setFullscreenQuad(mesh) {
    activeFullscreenQuad = mesh;
  }

  function setShader(id) {
    const def = registry.find(s => s.id === id);
    if (!def) return null;

    const target = def.mode === 'fullscreen' ? activeFullscreenQuad : activeMesh;
    if (!target) return null;

    if (target.material) target.material.dispose();
    target.material = def.createMaterial();
    activeDef = def;
    return def;
  }

  function update(delta) {
    if (!activeDef) return;

    const target = activeDef.mode === 'fullscreen' ? activeFullscreenQuad : activeMesh;
    if (target?.material?.uniforms) {
      activeDef.onFrame(target.material.uniforms, delta);
    }
  }

  return {
    registry,
    setMesh,
    setFullscreenQuad,
    setShader,
    update,
    getActive:  () => activeDef?.id ?? null,
    getActiveMode: () => activeDef?.mode ?? 'mesh',
    needsBloom: () => activeDef?.bloom ?? false,
  };
}

import * as THREE from 'three';
import defaultVert from './shaders/default.vert';
import defaultFrag from './shaders/default.frag';
import asciiVert   from './shaders/ascii.vert';
import asciiFrag   from './shaders/ascii.frag';
import lavaVert    from './shaders/lava.vert';
import lavaFrag    from './shaders/lava.frag';
import plasmaVert  from './shaders/plasma.vert';
import plasmaFrag  from './shaders/plasma.frag';
import fullscreenVert from './shaders/fullscreen.vert';
import morphSdfFrag from './shaders/morph-sdf.frag';
import starTorsionFrag from './shaders/star-torsion.frag';
import turbulenceCoreFrag from './shaders/turbulence-core.frag';

const ASCII_CHARS = ' .:-=+*#%@';

function buildAsciiAtlas(chars) {
  const glyphSize = 64;
  const canvas = document.createElement('canvas');
  canvas.width = glyphSize * chars.length;
  canvas.height = glyphSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create 2D context for ASCII glyph atlas.');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 46px monospace';

  for (let i = 0; i < chars.length; i += 1) {
    const x = i * glyphSize + glyphSize * 0.5;
    const y = glyphSize * 0.56;
    ctx.fillText(chars[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  return { texture, glyphCount: chars.length };
}

export function createShaderManager({ camera, renderer, lightUniforms }) {
  const textureLoader = new THREE.TextureLoader();
  const renderResolution = new THREE.Vector2();
  const sphereCenter = new THREE.Vector3();
  const sphereScale = new THREE.Vector3(1, 1, 1);
  const sphereInverseMatrix = new THREE.Matrix4();

  function getRenderResolution() {
    renderer.getDrawingBufferSize(renderResolution);
    return renderResolution;
  }

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

  let asciiAtlas = null;
  function getAsciiAtlas() {
    if (asciiAtlas) return asciiAtlas;
    asciiAtlas = buildAsciiAtlas(ASCII_CHARS);
    return asciiAtlas;
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
      id: 'ascii',
      name: 'ASCII',
      mode: 'mesh',
      bloom: 0,
      createMaterial() {
        const { texture, glyphCount } = getAsciiAtlas();
        return new THREE.ShaderMaterial({
          vertexShader: asciiVert,
          fragmentShader: asciiFrag,
          transparent: true,
          uniforms: {
            uCameraPos: { value: new THREE.Vector3() },
            uInverseProjection: { value: camera.projectionMatrixInverse.clone() },
            uCameraWorldMatrix: { value: camera.matrixWorld.clone() },
            uResolution: { value: getRenderResolution().clone() },
            uCellSize: { value: new THREE.Vector2(18.0, 24.0) },
            uGlyphAtlas: { value: texture },
            uGlyphCount: { value: glyphCount },
            uGlyphColor: { value: new THREE.Color(0xf6b65b) },
            uSphereRadius: { value: 1.5 },
            uSphereCenter: { value: new THREE.Vector3() },
            uSphereScale: { value: new THREE.Vector3(1, 1, 1) },
            uSphereInverseMatrix: { value: new THREE.Matrix4() },
            ...lightUniforms,
          },
        });
      },
      onFrame(uniforms) {
        if (activeMesh) {
          activeMesh.updateWorldMatrix(true, false);
          activeMesh.getWorldPosition(sphereCenter);
          activeMesh.getWorldScale(sphereScale);
          sphereInverseMatrix.copy(activeMesh.matrixWorld).invert();
          uniforms.uSphereCenter.value.copy(sphereCenter);
          uniforms.uSphereScale.value.copy(sphereScale);
          uniforms.uSphereInverseMatrix.value.copy(sphereInverseMatrix);
        }

        uniforms.uCameraPos.value.copy(camera.position);
        uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
        uniforms.uCameraWorldMatrix.value.copy(camera.matrixWorld);
        uniforms.uResolution.value.copy(getRenderResolution());
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
            uResolution: { value: getRenderResolution().clone() },
          },
        });
      },
      onFrame(uniforms, delta) {
        uniforms.uTime.value += delta;
        uniforms.uResolution.value.copy(getRenderResolution());
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
            uResolution: { value: getRenderResolution().clone() },
          },
        });
      },
      onFrame(uniforms) {
        uniforms.uTime.value = performance.now() * 0.001;
        uniforms.uResolution.value.copy(getRenderResolution());
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
            uResolution: { value: getRenderResolution().clone() },
          },
        });
      },
      onFrame(uniforms) {
        uniforms.uTime.value = performance.now() * 0.001;
        uniforms.uResolution.value.copy(getRenderResolution());
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

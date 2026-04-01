import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass }      from 'three/examples/jsm/postprocessing/BloomPass.js';
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js';

import { createScene }        from './scene.js';
import { createStudioLights } from './lighting.js';
import { createSphere }       from './sphere.js';
import { createShaderManager } from './shaderManager.js';
import { createUI }            from './ui.js';

// ─── Setup ─────────────────────────────────────────────────────────────────
const { scene, camera, renderer, controls } = createScene();
renderer.autoClear = false;

const { uniforms: lightUniforms } = createStudioLights(scene);
const sphere                      = createSphere(scene);
const fullscreenScene             = new THREE.Scene();
const fullscreenCamera            = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fullscreenQuad              = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.MeshBasicMaterial({ visible: false })
);
fullscreenQuad.frustumCulled = false;
fullscreenScene.add(fullscreenQuad);

const shaderManager = createShaderManager({ camera, lightUniforms });
shaderManager.setMesh(sphere);
shaderManager.setFullscreenQuad(fullscreenQuad);

// ─── EffectComposer ─────────────────────────────────────────────────────────
let composer = buildComposer(0);
let activeMode = 'mesh';

function buildComposer(bloomStrength) {
  const c = new EffectComposer(renderer);
  c.addPass(new RenderPass(scene, camera));
  if (bloomStrength > 0) c.addPass(new BloomPass(bloomStrength));
  c.addPass(new OutputPass());
  return c;
}

function applyRenderMode(def) {
  activeMode = def.mode ?? 'mesh';
  const isFullscreen = activeMode === 'fullscreen';

  sphere.visible = !isFullscreen;
  fullscreenQuad.visible = isFullscreen;
  controls.enabled = !isFullscreen;
}

// ─── Shader switching ───────────────────────────────────────────────────────
const ui = createUI(shaderManager, (id) => {
  const def = shaderManager.setShader(id);
  if (!def) return;
  applyRenderMode(def);
  composer = buildComposer(def.bloom);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Boot with studio shader
applyRenderMode(shaderManager.setShader('studio'));
ui.setActive('studio');
composer = buildComposer(0);

// ─── Resize ─────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Render loop ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (activeMode === 'mesh') {
    sphere.rotation.y += 0.4 * delta;
    sphere.rotation.x += 0.12 * delta;
  }

  shaderManager.update(delta);
  if (controls.enabled) controls.update();

  renderer.clear();
  if (activeMode === 'fullscreen') {
    renderer.render(fullscreenScene, fullscreenCamera);
  } else {
    composer.render();
  }
}

animate();

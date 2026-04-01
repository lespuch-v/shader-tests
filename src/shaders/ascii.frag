precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPos;

uniform sampler2D uGlyphAtlas;
uniform vec2 uResolution;
uniform vec2 uCellSize;
uniform float uGlyphCount;
uniform vec3 uGlyphColor;
uniform vec3 uCameraPos;
uniform mat4 uInverseProjection;
uniform mat4 uCameraWorldMatrix;
uniform float uSphereRadius;
uniform vec3 uSphereCenter;
uniform vec3 uSphereScale;
uniform mat4 uSphereInverseMatrix;

uniform vec3  uKeyLightPos;
uniform vec3  uKeyLightColor;
uniform float uKeyLightIntensity;

uniform vec3  uFillLightPos;
uniform vec3  uFillLightColor;
uniform float uFillLightIntensity;

uniform vec3  uRimLightPos;
uniform vec3  uRimLightColor;
uniform float uRimLightIntensity;

uniform vec3  uAmbientColor;
uniform float uAmbientIntensity;

vec3 lightContribution(
  vec3 worldPos,
  vec3 normal,
  vec3 viewDir,
  vec3 lightPos,
  vec3 lightColor,
  float intensity
) {
  vec3 lightDir = normalize(lightPos - worldPos);
  float diffuse = max(dot(normal, lightDir), 0.0);

  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), 56.0);

  return lightColor * intensity * (vec3(diffuse) + vec3(specular * 0.18));
}

float surfaceBrightness(vec3 worldPos, vec3 normal) {
  vec3 viewDir = normalize(uCameraPos - worldPos);

  vec3 lit = uAmbientColor * uAmbientIntensity;
  lit += lightContribution(worldPos, normal, viewDir, uKeyLightPos, uKeyLightColor, uKeyLightIntensity);
  lit += lightContribution(worldPos, normal, viewDir, uFillLightPos, uFillLightColor, uFillLightIntensity);
  lit += lightContribution(worldPos, normal, viewDir, uRimLightPos, uRimLightColor, uRimLightIntensity);

  float luminance = dot(lit, vec3(0.2126, 0.7152, 0.0722));
  return clamp(luminance / (1.0 + luminance), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float surfaceDrift(vec3 worldPos) {
  vec3 localPos = (uSphereInverseMatrix * vec4(worldPos, 1.0)).xyz;
  vec3 sphereNormal = normalize(localPos);
  vec2 sphereUv = vec2(
    atan(sphereNormal.z, sphereNormal.x) / (6.28318530718) + 0.5,
    acos(clamp(sphereNormal.y, -1.0, 1.0)) / 3.14159265359
  );

  vec2 tile = floor(sphereUv * vec2(18.0, 12.0));
  float tileHash = hash12(tile);
  float stripe = sin(sphereUv.x * 25.1327412287 + sphereUv.y * 12.5663706144) * 0.5 + 0.5;

  return (tileHash - 0.5) * 0.16 + (stripe - 0.5) * 0.08;
}

bool raycastSphere(vec2 pixel, out vec3 hitPos, out vec3 hitNormal) {
  vec2 ndc = pixel / uResolution * 2.0 - 1.0;
  vec4 viewPos = uInverseProjection * vec4(ndc, -1.0, 1.0);
  viewPos /= max(viewPos.w, 0.0001);

  vec3 rayDir = normalize((uCameraWorldMatrix * vec4(normalize(viewPos.xyz), 0.0)).xyz);
  float worldRadius = uSphereRadius * ((uSphereScale.x + uSphereScale.y + uSphereScale.z) / 3.0);

  vec3 originToCenter = uCameraPos - uSphereCenter;
  float b = dot(originToCenter, rayDir);
  float c = dot(originToCenter, originToCenter) - (worldRadius * worldRadius);
  float h = b * b - c;

  if (h < 0.0) return false;

  float travel = -b - sqrt(h);
  if (travel < 0.0) {
    travel = -b + sqrt(h);
  }
  if (travel < 0.0) return false;

  hitPos = uCameraPos + rayDir * travel;
  hitNormal = normalize(hitPos - uSphereCenter);
  return true;
}

void main() {
  vec2 cellCoord = floor(gl_FragCoord.xy / uCellSize);
  vec2 cellOrigin = cellCoord * uCellSize;
  vec2 cellCenter = cellOrigin + (uCellSize * 0.5);
  vec2 glyphUv = (gl_FragCoord.xy - cellOrigin) / uCellSize;

  vec3 samplePos = vWorldPos;
  vec3 sampleNormal = normalize(vNormal);
  vec3 hitPos;
  vec3 hitNormal;

  // Sample the sphere at the center of the screen-space cell so each cell
  // settles on one glyph instead of changing per fragment.
  if (raycastSphere(cellCenter, hitPos, hitNormal)) {
    samplePos = hitPos;
    sampleNormal = hitNormal;
  }

  float brightness = surfaceBrightness(samplePos, sampleNormal);
  brightness = clamp(brightness + surfaceDrift(samplePos), 0.0, 1.0);
  float glyphIndex = min(floor(brightness * uGlyphCount), uGlyphCount - 1.0);
  vec2 atlasUv = vec2((glyphIndex + glyphUv.x) / uGlyphCount, glyphUv.y);
  float glyphMask = texture2D(uGlyphAtlas, atlasUv).a;

  glyphMask = smoothstep(0.32, 0.6, glyphMask);
  if (glyphMask <= 0.01) discard;

  float intensity = mix(0.45, 1.0, brightness);
  gl_FragColor = vec4(uGlyphColor * intensity, glyphMask);
}

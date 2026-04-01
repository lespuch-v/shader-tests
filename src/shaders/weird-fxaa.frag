precision highp float;

uniform float uTime;
uniform vec3 uCameraPos;

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

in vec3 vWorldPos;
in vec3 vWorldNormal;
in vec3 vObjectPos;
in vec3 vObjectNormal;
out vec4 fragColor;

vec3 sampleSource(vec2 uv) {
  uv = fract(uv);

  vec2 p = uv - 0.5;
  float t = uTime;

  vec2 swirl = vec2(
    sin(p.y * 14.0 + t * 1.4 + sin(p.x * 9.0)),
    cos(p.x * 13.0 - t * 1.2 + cos(p.y * 8.0))
  );
  p += 0.16 * swirl;

  float radius = length(p);
  float angle = atan(p.y, p.x);

  float bands = 0.5 + 0.5 * cos(radius * 30.0 - t * 3.1 + sin(angle * 7.0) * 4.0);
  float ripples = 0.5 + 0.5 * sin((p.x - p.y) * 28.0 + t * 2.6);
  float veins = smoothstep(0.4, 0.92, abs(sin((p.x + p.y) * 24.0) * cos((p.x - p.y) * 18.0 + t)));
  float pulse = smoothstep(0.18, 0.92, 1.0 - radius + 0.18 * sin(t * 2.0 + angle * 5.0));

  vec3 cool = vec3(0.05, 0.16, 0.34);
  vec3 warm = vec3(1.2, 0.47, 0.2);
  vec3 highlight = vec3(1.5, 0.95, 0.8);

  vec3 color = mix(cool, warm, bands);
  color = mix(color, highlight, ripples * pulse);
  color += veins * vec3(0.24, 0.16, 0.28);

  return color;
}

vec3 fxaa(vec2 uv, vec2 texelSz) {
  const float span_max = 8.0;
  const float reduce_min = 1.0 / 128.0;
  const float reduce_mul = 1.0 / 32.0;
  const vec3 luma = vec3(0.299, 0.587, 0.114);

  vec3 rgbCC = sampleSource(uv);
  vec3 rgb00 = sampleSource(uv + vec2(-0.5, -0.5) * texelSz);
  vec3 rgb10 = sampleSource(uv + vec2( 0.5, -0.5) * texelSz);
  vec3 rgb01 = sampleSource(uv + vec2(-0.5,  0.5) * texelSz);
  vec3 rgb11 = sampleSource(uv + vec2( 0.5,  0.5) * texelSz);

  float lumaCC = dot(rgbCC, luma);
  float luma00 = dot(rgb00, luma);
  float luma10 = dot(rgb10, luma);
  float luma01 = dot(rgb01, luma);
  float luma11 = dot(rgb11, luma);

  vec2 dir = vec2(
    (luma01 + luma11) - (luma00 + luma10),
    (luma00 + luma01) - (luma10 + luma11)
  );

  float dirReduce = max((luma00 + luma10 + luma01 + luma11) * reduce_mul, reduce_min);
  float rcpDir = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDir, -span_max, span_max) * texelSz;

  vec3 A = 0.5 * (
    sampleSource(uv - dir * (1.0 / 6.0))
    + sampleSource(uv + dir * (1.0 / 6.0))
  );

  vec3 B = A * 0.5 + 0.25 * (
    sampleSource(uv - dir * 0.5)
    + sampleSource(uv + dir * 0.5)
  );

  float lumaMin = min(lumaCC, min(min(luma00, luma10), min(luma01, luma11)));
  float lumaMax = max(lumaCC, max(max(luma00, luma10), max(luma01, luma11)));
  float lumaB = dot(B, luma);

  return ((lumaB < lumaMin) || (lumaB > lumaMax)) ? A : B;
}

vec3 triplanarPattern(vec3 pos, vec3 normal) {
  vec3 blend = pow(abs(normal), vec3(4.0));
  blend /= max(dot(blend, vec3(1.0)), 0.0001);

  vec2 texel = vec2(sqrt(2.0) / 720.0);

  vec3 xColor = fxaa(pos.zy * 1.35 + vec2(0.09 * uTime, -0.06 * uTime), texel);
  vec3 yColor = fxaa(pos.xz * 1.35 + vec2(-0.07 * uTime, 0.05 * uTime), texel);
  vec3 zColor = fxaa(pos.xy * 1.35 + vec2(0.04 * uTime, 0.08 * uTime), texel);

  return xColor * blend.x + yColor * blend.y + zColor * blend.z;
}

vec3 environmentColor(vec3 dir) {
  float skyMix = smoothstep(-0.25, 0.65, dir.y);
  vec3 deep = vec3(0.01, 0.02, 0.05);
  vec3 sky = vec3(0.16, 0.5, 0.95);
  vec3 sunset = vec3(1.1, 0.45, 0.24);

  vec3 env = mix(deep, sky, skyMix);
  float horizon = pow(max(1.0 - abs(dir.y + 0.02) * 10.0, 0.0), 3.0);
  env += sunset * horizon * 0.45;
  return env;
}

vec3 lightContribution(
  vec3 normal,
  vec3 viewDir,
  vec3 baseColor,
  vec3 lightPos,
  vec3 lightColor,
  float intensity
) {
  vec3 lightDir = normalize(lightPos - vWorldPos);
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 72.0);
  return lightColor * intensity * (baseColor * diff * 0.28 + vec3(spec) * 0.95);
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);
  vec3 reflectDir = reflect(-viewDir, normal);

  vec3 pattern = triplanarPattern(vObjectPos, normalize(vObjectNormal));
  vec3 env = environmentColor(reflectDir);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.2);
  float innerGlowMask = smoothstep(1.18, 0.15, length(vObjectPos));
  vec3 innerGlow = mix(vec3(0.15, 0.1, 0.2), vec3(1.3, 0.72, 0.4), innerGlowMask);

  vec3 baseColor = mix(pattern * 0.7, env, 0.3);
  vec3 color = uAmbientColor * uAmbientIntensity * baseColor * 0.55;

  color += lightContribution(normal, viewDir, baseColor, uKeyLightPos, uKeyLightColor, uKeyLightIntensity);
  color += lightContribution(normal, viewDir, baseColor, uFillLightPos, uFillLightColor, uFillLightIntensity);
  color += lightContribution(normal, viewDir, baseColor, uRimLightPos, uRimLightColor, uRimLightIntensity);

  color += env * (0.35 + 0.85 * fresnel);
  color += innerGlow * (0.16 + 0.36 * innerGlowMask);
  color += pattern * innerGlowMask * 0.22;

  color = color / (1.0 + color * 0.55);
  color = pow(color, vec3(0.9, 0.92, 0.95));

  fragColor = vec4(color, 1.0);
}

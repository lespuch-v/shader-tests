precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

// Camera
uniform vec3 uCameraPos;

// 3-point studio lights
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

// Material
uniform vec3  uBaseColor;
uniform float uRoughness;
uniform float uSpecularPower;

vec3 blinnPhong(
  vec3 normal,
  vec3 viewDir,
  vec3 lightPos,
  vec3 lightColor,
  float intensity
) {
  vec3 lightDir = normalize(lightPos - vWorldPos);
  float diff = max(dot(normal, lightDir), 0.0);

  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), uSpecularPower);
  float specMask = (1.0 - uRoughness);

  return lightColor * intensity * (uBaseColor * diff + vec3(specMask * spec));
}

void main() {
  vec3 normal  = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);

  vec3 color = uAmbientColor * uAmbientIntensity * uBaseColor;

  color += blinnPhong(normal, viewDir, uKeyLightPos,  uKeyLightColor,  uKeyLightIntensity);
  color += blinnPhong(normal, viewDir, uFillLightPos, uFillLightColor, uFillLightIntensity);
  color += blinnPhong(normal, viewDir, uRimLightPos,  uRimLightColor,  uRimLightIntensity);

  gl_FragColor = vec4(color, 1.0);
}

uniform float uTime;

out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec3 vObjectPos;
out vec3 vObjectNormal;

float blobLayer(vec3 p, float t) {
  float waveA = sin(p.x * 3.6 + t * 1.3);
  float waveB = sin(p.y * 4.2 - t * 1.1);
  float waveC = sin(p.z * 3.9 + t * 1.6);
  float fold = sin((p.x + p.y - p.z) * 5.2 - t * 1.8);
  float radial = sin(length(p.xy) * 8.0 - t * 2.4 + p.z * 2.8);
  return waveA * waveB * 0.45 + waveC * 0.25 + fold * 0.2 + radial * 0.1;
}

void main() {
  vec3 basePos = position;
  vec3 baseNormal = normalize(normal);
  float t = uTime;

  float displacement = 0.24 * blobLayer(basePos, t);
  displacement += 0.06 * sin(t * 1.7 + dot(baseNormal, vec3(1.3, -0.8, 0.6)) * 6.0);

  vec3 displacedPos = basePos + baseNormal * displacement;

  vec3 warpedNormal = normalize(
    baseNormal
    + 0.3 * vec3(
      blobLayer(basePos.yzx + 1.7, t + 0.4),
      blobLayer(basePos.zxy - 0.9, t + 0.7),
      blobLayer(basePos.xyz + 0.3, t + 1.1)
    )
  );

  vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(normalMatrix * warpedNormal);
  vObjectPos = displacedPos;
  vObjectNormal = warpedNormal;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

precision highp float;

uniform float uTime;
uniform vec2 uResolution;

in vec2 vUv;
out vec4 fragColor;

mat2 rot2D(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float getBoxSdf(vec3 positionSample, vec3 bounds) {
  vec3 distanceToEdge = abs(positionSample) - bounds;
  return length(max(distanceToEdge, 0.0))
    + min(max(distanceToEdge.x, max(distanceToEdge.y, distanceToEdge.z)), 0.0);
}

float getPyramidSdf(vec3 positionSample, float height, float baseHalfWidth) {
  vec3 absolutePosition = abs(positionSample);
  float squareBase = max(absolutePosition.x, absolutePosition.z);

  vec2 boundaryNormalized = normalize(vec2(height, baseHalfWidth));
  vec2 boundaryCoordinate = vec2(squareBase, positionSample.y - height * 0.5);
  float slopeDistance = dot(boundaryCoordinate, boundaryNormalized);

  float capDistance = -positionSample.y - height * 0.5;
  return max(slopeDistance, capDistance);
}

float getObjectSceneSdf(vec3 positionSample) {
  float rawTime = uTime * 1.5;
  float morphCycle = smoothstep(0.15, 0.85, sin(rawTime) * 0.5 + 0.5);

  float distanceCube = getBoxSdf(positionSample, vec3(0.5));
  float distancePyramid = getPyramidSdf(positionSample, 1.0, 0.5);

  return mix(distanceCube, distancePyramid, morphCycle);
}

void main() {
  vec2 fragmentCoordinates = vUv * uResolution;
  vec2 normalizedUv = (fragmentCoordinates - 0.5 * uResolution.xy) / uResolution.y;

  vec3 cameraOrigin = vec3(0.0, 1.0, -3.5);
  vec3 cameraTarget = vec3(0.0, 0.0, 0.0);
  vec3 cameraForward = normalize(cameraTarget - cameraOrigin);
  vec3 cameraRight = normalize(cross(cameraForward, vec3(0.0, 1.0, 0.0)));
  vec3 cameraUp = cross(cameraRight, cameraForward);

  vec3 rayDirection = normalize(
    normalizedUv.x * cameraRight
    + normalizedUv.y * cameraUp
    + 2.0 * cameraForward
  );

  vec3 accumulatedLight = vec3(0.0);
  float rayTravelDistance = 0.0;

  for (float iteration = 0.0; iteration < 25.0; iteration += 1.0) {
    vec3 raySamplePoint = cameraOrigin + rayDirection * rayTravelDistance;

    raySamplePoint.xz *= rot2D(raySamplePoint.y * 0.3 + uTime * 0.4);
    raySamplePoint.yz *= rot2D(sin(uTime * 0.3) * 0.2);

    float distanceToScene = getObjectSceneSdf(raySamplePoint);
    float plasmaDensity = 0.1 / (abs(distanceToScene) + 0.015);
    vec3 phaseColor = 0.5 + 0.5 * cos(
      iteration * 0.15 + rayTravelDistance * 2.0 + vec3(0.0, 1.0, 2.0) - uTime
    );
    float pulse = 0.5 + 0.5 * sin(rayTravelDistance * 8.0 - uTime * 2.0);

    accumulatedLight += phaseColor * plasmaDensity * (0.2 + pulse * 0.8);
    rayTravelDistance += abs(distanceToScene) * 0.6 + 0.025;

    if (rayTravelDistance > 5.0) break;
  }

  vec3 color = tanh(accumulatedLight * 0.1);
  fragColor = vec4(color, 1.0);
}

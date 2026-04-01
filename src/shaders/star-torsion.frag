precision highp float;

uniform float uTime;
uniform vec2 uResolution;

in vec2 vUv;
out vec4 fragColor;

#define TURB_NUM 8
#define TURB_AMP 1.05
#define TURB_SPEED 0.7
#define TURB_FREQ 4.0
#define TURB_EXP 2.0
#define PASSTHROUGH 0.11
#define BRIGHTNESS 0.0005
#define WARP_BLEND 0.82

mat2 rotate(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec3 torsion(vec3 pos) {
  float freq = TURB_FREQ;
  mat3 E = mat3(1.0);
  mat3 rotx = mat3(
    1.0, 0.0, 0.0,
    0.0, 0.6, -0.8,
    0.0, 0.8, 0.6
  );
  mat3 rotz = mat3(
    0.8, -0.6, 0.0,
    0.6, 0.8, 0.0,
    0.0, 0.0, 1.0
  );
  mat3 roty = mat3(
    0.8, 0.0, -0.6,
    0.0, 1.0, 0.0,
    0.6, 0.0, 0.8
  );

  E *= rotx;
  E *= rotz;

  for (int i = 0; i < TURB_NUM; i++) {
    if (i >= 2 && i <= 4) continue;

    float phase = freq * (pos * E).y + TURB_SPEED * uTime;
    pos += TURB_AMP * E[0] * sin(phase) / freq;
    E *= rotx;
    E *= rotz;
    E *= roty;
    freq *= TURB_EXP;
  }

  return pos;
}

float sphere(vec3 p) {
  float d = length(p) - 3.0;
  if (d < 0.0) {
    return (-d * 0.7) + PASSTHROUGH;
  }
  return d * 0.7 + PASSTHROUGH * 2.0;
}

void main() {
  vec3 col = vec3(0.0);
  vec2 fragCoord = vUv * uResolution;
  vec2 u = (fragCoord - 0.5 * uResolution.xy) / uResolution.y;

  vec3 dir = normalize(vec3(u + u, 1.0));
  vec3 pos = vec3(0.0, 0.0, -5.0);

  pos.xz *= rotate(uTime * 0.1);
  dir.xz *= rotate(uTime * 0.1);

  for (int i = 0; i < 30; i++) {
    vec3 warpedPos = mix(pos, torsion(pos), WARP_BLEND);
    float vol = sphere(warpedPos);
    pos += dir * vol / 2.5;

    vec3 starColor = vec3(0.8308, 0.9819, 3.0841);
    starColor *= vec3(1.06, 1.02, 0.96);
    col += starColor / vol;
  }

  col = tanh(BRIGHTNESS * sqrt(col * col * col));
  fragColor = vec4(col, 1.0);
}

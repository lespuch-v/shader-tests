precision highp float;

uniform float uTime;

in vec3 vObjectPos;
in vec3 vObjectNormal;
out vec4 fragColor;

vec3 plasmaSample(vec2 coord) {
  vec2 u = coord * 0.2;
  vec2 v = vec2(1.0);
  vec2 w = vec2(0.0);
  vec2 k = u;

  vec4 o = vec4(1.0, 2.0, 3.0, 0.0);

  float a = 0.5;
  float t = uTime;

  for (float i = 1.0; i < 19.0; i += 1.0) {
    t += 1.0;
    a += 0.03;

    v = cos(t - 7.0 * u * pow(a, i)) - 5.0 * u;

    vec4 basis = cos(i + t * 0.02 - vec4(0.0, 11.0, 33.0, 0.0));
    u *= mat2(basis.x, basis.y, basis.z, basis.w);

    u += 0.005 * tanh(40.0 * dot(u, u) * cos(100.0 * u.yx + t))
      + 0.2 * a * u
      + 0.003 * cos(t + 4.0 * exp(-0.01 * dot(o, o)));

    w = u / (1.0 - 2.0 * dot(u, u));

    float field = length((1.0 + i * dot(v, v)) * sin(w * 3.0 - 9.0 * u.yx + t));
    o += (1.0 + cos(vec4(0.0, 1.0, 3.0, 0.0) + t))
      / max(field, 0.35 + 0.02 * i);
  }

  o = pow(
    1.0 - sqrt(exp(-o * o * o / 200.0)),
    0.3 * o / max(o, vec4(0.0001))
  ) - dot(k - u, k - u) / 250.0;

  vec3 color = max(o.rgb, 0.0);
  color *= vec3(0.82, 0.96, 1.18);
  color = pow(color, vec3(1.15, 1.05, 0.95));
  color = color / (1.0 + color * 0.8);
  color *= 0.88;

  return color;
}

void main() {
  vec3 p = normalize(vObjectPos);
  vec3 n = normalize(vObjectNormal);

  vec3 blend = pow(abs(n), vec3(6.0));
  blend /= max(dot(blend, vec3(1.0)), 0.0001);

  vec3 sampleX = plasmaSample(vec2(p.z, p.y));
  vec3 sampleY = plasmaSample(vec2(p.x, p.z));
  vec3 sampleZ = plasmaSample(vec2(p.x, p.y));

  vec3 color = sampleX * blend.x + sampleY * blend.y + sampleZ * blend.z;
  color *= 0.94 + 0.06 * smoothstep(0.0, 1.0, blend.z);

  fragColor = vec4(color, 1.0);
}
